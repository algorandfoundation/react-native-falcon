package com.margelo.nitro.falcon
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Falcon : HybridFalconSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
