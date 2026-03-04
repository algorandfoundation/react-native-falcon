#include <jni.h>
#include "falconOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::falcon::initialize(vm);
}
