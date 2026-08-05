import { useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { Falcon1024Module } from "react-native-falcon";

export default function App() {
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    try {
      const msg = new TextEncoder().encode("Hello, Falcon!");

      // 1. Generate Key
      setStatus("Generating key...");
      const { publicKey, privateKey } = Falcon1024Module.generateKey();

      // 2. Sign
      setStatus("Signing message...");
      const sig = Falcon1024Module.signCompressed(privateKey, msg.buffer as ArrayBuffer);

      // 3. Verify
      setStatus("Verifying signature...");
      Falcon1024Module.verify(publicKey, sig, msg.buffer as ArrayBuffer);

      // 4. Constants
      const info = [
        `Public Key Size: ${Falcon1024Module.publicKeySize}`,
        `Private Key Size: ${Falcon1024Module.privateKeySize}`,
        `N: ${Falcon1024Module.n}`,
        `Signature Size: ${sig.byteLength}`,
      ].join("\n");

      setStatus(`Success!\n\n${info}`);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Falcon Nitro Test</Text>
        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    fontFamily: "monospace",
  },
});
