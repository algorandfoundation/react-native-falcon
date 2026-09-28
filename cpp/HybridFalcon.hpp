#pragma once

#include "HybridFalconSpec.hpp"
#include "falcon.h"
#include "deterministic.h"
#include <NitroModules/ArrayBuffer.hpp>
#include <stdexcept>
#include <vector>

namespace margelo::nitro::falcon {

  class HybridFalcon: public HybridFalconSpec {
    public:
      HybridFalcon(): HybridObject(TAG) { }

      // Properties
      double getPublicKeySize() override { return FALCON_DET1024_PUBKEY_SIZE; }
      double getPrivateKeySize() override { return FALCON_DET1024_PRIVKEY_SIZE; }
      double getCurrentSaltVersion() override { return FALCON_DET1024_CURRENT_SALT_VERSION; }
      double getCtSignatureSize() override { return FALCON_DET1024_SIG_CT_SIZE; }
      double getSignatureMaxSize() override { return FALCON_DET1024_SIG_COMPRESSED_MAXSIZE; }
      double getN() override { return 1 << FALCON_DET1024_LOGN; }

      // Methods
      KeyPair generateKey(const std::optional<std::shared_ptr<ArrayBuffer>>& seed) override {
        shake256_context rng;
        if (seed.has_value() && (*seed)->size() > 0) {
          shake256_init_prng_from_seed(&rng, (*seed)->data(), (*seed)->size());
        } else {
          // Without a seed, the PRNG must be seeded from the OS RNG. Seeding from an
          // empty buffer would make every generated key pair identical.
          int rngResult = shake256_init_prng_from_system(&rng);
          if (rngResult != 0) {
            throw std::runtime_error("Falcon keygen failed with error code " + std::to_string(rngResult));
          }
        }

        auto publicKeyBuffer = ArrayBuffer::allocate(FALCON_DET1024_PUBKEY_SIZE);
        auto privateKeyBuffer = ArrayBuffer::allocate(FALCON_DET1024_PRIVKEY_SIZE);

        int r = falcon_det1024_keygen(&rng, privateKeyBuffer->data(), publicKeyBuffer->data());
        if (r != 0) {
          throw std::runtime_error("Falcon keygen failed with error code " + std::to_string(r));
        }

        return KeyPair{ publicKeyBuffer, privateKeyBuffer };
      }

      std::shared_ptr<ArrayBuffer> signCompressed(const std::shared_ptr<ArrayBuffer>& privateKey, const std::shared_ptr<ArrayBuffer>& msg) override {
        if (privateKey->size() < FALCON_DET1024_PRIVKEY_SIZE) {
          throw std::runtime_error("Invalid private key size");
        }

        size_t sigLen = 0;
        std::vector<uint8_t> sig(FALCON_DET1024_SIG_COMPRESSED_MAXSIZE);

        int r = falcon_det1024_sign_compressed(sig.data(), &sigLen, privateKey->data(), msg->data(), msg->size());
        if (r != 0) {
          throw std::runtime_error("Falcon sign failed with error code " + std::to_string(r));
        }

        auto resultBuffer = ArrayBuffer::allocate(sigLen);
        memcpy(resultBuffer->data(), sig.data(), sigLen);
        return resultBuffer;
      }

      std::shared_ptr<ArrayBuffer> convertToCT(const std::shared_ptr<ArrayBuffer>& signature) override {
        auto sigCTBuffer = ArrayBuffer::allocate(FALCON_DET1024_SIG_CT_SIZE);

        int r = falcon_det1024_convert_compressed_to_ct(sigCTBuffer->data(), signature->data(), signature->size());
        if (r != 0) {
          throw std::runtime_error("Falcon convert to CT failed with error code " + std::to_string(r));
        }
        return sigCTBuffer;
      }

      void verify(const std::shared_ptr<ArrayBuffer>& publicKey, const std::shared_ptr<ArrayBuffer>& signature, const std::shared_ptr<ArrayBuffer>& msg) override {
        if (publicKey->size() < FALCON_DET1024_PUBKEY_SIZE) {
          throw std::runtime_error("Invalid public key size");
        }
        if (signature->size() == 0) {
          throw std::runtime_error("Empty signature");
        }

        int r = falcon_det1024_verify_compressed(signature->data(), signature->size(), publicKey->data(), msg->data(), msg->size());
        if (r != 0) {
          throw std::runtime_error("Falcon verify failed with error code " + std::to_string(r));
        }
      }

      void verifyCTSignature(const std::shared_ptr<ArrayBuffer>& publicKey, const std::shared_ptr<ArrayBuffer>& signature, const std::shared_ptr<ArrayBuffer>& msg) override {
        if (publicKey->size() < FALCON_DET1024_PUBKEY_SIZE) {
          throw std::runtime_error("Invalid public key size");
        }
        if (signature->size() < FALCON_DET1024_SIG_CT_SIZE) {
          throw std::runtime_error("Invalid CT signature size");
        }

        int r = falcon_det1024_verify_ct(signature->data(), publicKey->data(), msg->data(), msg->size());
        if (r != 0) {
          throw std::runtime_error("Falcon verify CT failed with error code " + std::to_string(r));
        }
      }

      double getSaltVersion(const std::shared_ptr<ArrayBuffer>& signature) override {
        // Randomized (salted) signatures carry a nonce instead of a salt version.
        if (signature->size() > 0) {
          uint8_t header = ((uint8_t*)signature->data())[0];
          if ((header & 0x80) == 0) {
            throw std::runtime_error("Falcon get salt version failed with error code " + std::to_string(FALCON_ERR_FORMAT));
          }
        }
        int version = falcon_det1024_get_salt_version(signature->data());
        if (version < 0) {
            // If signature is too short, falcon.go returns 0
            if (signature->size() < 2) return 0;
            // Otherwise it might be an error, but let's follow falcon.go's behavior if possible.
            // falcon_det1024_get_salt_version returns the byte at index 1.
            return (double)((uint8_t*)signature->data())[1];
        }
        return version;
      }

      std::vector<double> getPublicKeyCoefficients(const std::shared_ptr<ArrayBuffer>& publicKey) override {
        size_t n = 1 << FALCON_DET1024_LOGN;
        std::vector<uint16_t> h(n);
        int r = falcon_det1024_pubkey_coeffs(h.data(), publicKey->data());
        if (r != 0) {
          throw std::runtime_error("Falcon pubkey coefficients failed with error code " + std::to_string(r));
        }
        std::vector<double> result(n);
        for (size_t i = 0; i < n; ++i) result[i] = h[i];
        return result;
      }

      std::vector<double> getS2Coefficients(const std::shared_ptr<ArrayBuffer>& signature) override {
        size_t n = 1 << FALCON_DET1024_LOGN;
        std::vector<int16_t> s2(n);
        int r = falcon_det1024_s2_coeffs(s2.data(), signature->data());
        if (r != 0) {
          throw std::runtime_error("Falcon S2 coefficients failed with error code " + std::to_string(r));
        }
        std::vector<double> result(n);
        for (size_t i = 0; i < n; ++i) result[i] = s2[i];
        return result;
      }

      std::vector<double> getS1Coefficients(const std::vector<double>& h_in, const std::vector<double>& c_in, const std::vector<double>& s2_in) override {
        size_t n = 1 << FALCON_DET1024_LOGN;
        if (h_in.size() != n || c_in.size() != n || s2_in.size() != n) {
          throw std::runtime_error("Invalid input vector size");
        }
        std::vector<uint16_t> h(n);
        std::vector<uint16_t> c(n);
        std::vector<int16_t> s2(n);
        for (size_t i = 0; i < n; ++i) {
          h[i] = (uint16_t)h_in[i];
          c[i] = (uint16_t)c_in[i];
          s2[i] = (int16_t)s2_in[i];
        }
        std::vector<int16_t> s1(n);
        int r = falcon_det1024_s1_coeffs(s1.data(), h.data(), c.data(), s2.data());
        if (r != 0) {
          throw std::runtime_error("Falcon S1 coefficients failed with error code " + std::to_string(r));
        }
        std::vector<double> result(n);
        for (size_t i = 0; i < n; ++i) result[i] = s1[i];
        return result;
      }

      std::vector<double> hashToPointCoefficients(const std::shared_ptr<ArrayBuffer>& msg, double saltVersion) override {
        size_t n = 1 << FALCON_DET1024_LOGN;
        std::vector<uint16_t> c(n);
        falcon_det1024_hash_to_point_coeffs(c.data(), msg->data(), msg->size(), (uint8_t)saltVersion);
        std::vector<double> result(n);
        for (size_t i = 0; i < n; ++i) result[i] = c[i];
        return result;
      }

      std::shared_ptr<ArrayBuffer> signCompressedRandomized(const std::shared_ptr<ArrayBuffer>& privateKey, const std::shared_ptr<ArrayBuffer>& msg) override {
        if (privateKey->size() < FALCON_DET1024_PRIVKEY_SIZE) {
          throw std::runtime_error("Invalid private key size");
        }

        shake256_context rng;
        int rngResult = shake256_init_prng_from_system(&rng);
        if (rngResult != 0) {
          throw std::runtime_error("Falcon sign failed with error code " + std::to_string(rngResult));
        }

        // The temporary buffer is ~80 KB for n=1024; keep it off the (small) mobile thread stack.
        std::vector<uint8_t> tmp(FALCON_TMPSIZE_SIGNDYN(FALCON_DET1024_LOGN));
        size_t sigLen = FALCON_SIG_COMPRESSED_MAXSIZE(FALCON_DET1024_LOGN);
        std::vector<uint8_t> sig(sigLen);

        int r = falcon_sign_dyn(&rng, sig.data(), &sigLen, FALCON_SIG_COMPRESSED,
                                privateKey->data(), FALCON_DET1024_PRIVKEY_SIZE, msg->data(), msg->size(),
                                tmp.data(), tmp.size());
        if (r != 0) {
          throw std::runtime_error("Falcon sign failed with error code " + std::to_string(r));
        }

        auto resultBuffer = ArrayBuffer::allocate(sigLen);
        memcpy(resultBuffer->data(), sig.data(), sigLen);
        return resultBuffer;
      }

      void verifyRandomized(const std::shared_ptr<ArrayBuffer>& publicKey, const std::shared_ptr<ArrayBuffer>& signature, const std::shared_ptr<ArrayBuffer>& msg) override {
        if (publicKey->size() < FALCON_DET1024_PUBKEY_SIZE) {
          throw std::runtime_error("Invalid public key size");
        }
        if (signature->size() == 0) {
          throw std::runtime_error("Empty signature");
        }

        std::vector<uint8_t> tmp(FALCON_TMPSIZE_VERIFY(FALCON_DET1024_LOGN));
        int r = falcon_verify(signature->data(), signature->size(), FALCON_SIG_COMPRESSED,
                              publicKey->data(), FALCON_DET1024_PUBKEY_SIZE, msg->data(), msg->size(),
                              tmp.data(), tmp.size());
        if (r != 0) {
          throw std::runtime_error("Falcon verify failed with error code " + std::to_string(r));
        }
      }
  };

} // namespace margelo::nitro::falcon
