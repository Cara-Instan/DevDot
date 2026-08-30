import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import Lenis from 'lenis'
import { useSettingsStore } from '@/stores/settings'

export interface UseSmoothScrollOptions {
  wrapperRef: Ref<HTMLElement | null>
  contentRef?: Ref<HTMLElement | null>
}

export function useSmoothScroll(options: UseSmoothScrollOptions) {
  const { wrapperRef, contentRef } = options
  const settingsStore = useSettingsStore()
  const lenis = ref<Lenis | null>(null)
  let rafId: number | null = null

  function initLenis() {
    if (!wrapperRef.value) return
    if (!settingsStore.smoothScrolling) return

    // Destroy existing instance if any
    destroyLenis()

    const wrapper = wrapperRef.value
    const content = contentRef?.value || (wrapper.firstElementChild as HTMLElement) || wrapper

    try {
      const instance = new Lenis({
        wrapper,
        content,
        duration: 1.0,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration curve
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: settingsStore.scrollMultiplier || 1.25,
        touchMultiplier: 1.0,
        infinite: false
      })

      lenis.value = instance

      function raf(time: number) {
        if (lenis.value) {
          lenis.value.raf(time)
          rafId = requestAnimationFrame(raf)
        }
      }

      rafId = requestAnimationFrame(raf)
    } catch (e) {
      console.warn('[useSmoothScroll] Failed to initialize Lenis:', e)
    }
  }

  function destroyLenis() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (lenis.value) {
      lenis.value.destroy()
      lenis.value = null
    }
  }

  function scrollToTop(immediate = false) {
    if (lenis.value) {
      lenis.value.scrollTo(0, { immediate })
    } else if (wrapperRef.value) {
      wrapperRef.value.scrollTo({
        top: 0,
        behavior: immediate ? 'auto' : 'smooth'
      })
    }
  }

  function scrollTo(target: number | HTMLElement | string, offset = 0, immediate = false) {
    if (lenis.value) {
      lenis.value.scrollTo(target, { offset, immediate })
    } else if (wrapperRef.value) {
      if (typeof target === 'number') {
        wrapperRef.value.scrollTo({
          top: target + offset,
          behavior: immediate ? 'auto' : 'smooth'
        })
      } else if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' })
      }
    }
  }

  function refresh() {
    nextTick(() => {
      if (lenis.value) {
        lenis.value.resize()
      }
    })
  }

  // Watch for settings changes (toggle on/off or multiplier change)
  watch(
    () => [settingsStore.smoothScrolling, settingsStore.scrollMultiplier],
    ([enabled]) => {
      if (enabled) {
        initLenis()
      } else {
        destroyLenis()
      }
    }
  )

  // Re-init on wrapper mount / update
  watch(
    () => wrapperRef.value,
    (el) => {
      if (el) {
        nextTick(() => initLenis())
      } else {
        destroyLenis()
      }
    }
  )

  onMounted(() => {
    nextTick(() => {
      initLenis()
    })
  })

  onUnmounted(() => {
    destroyLenis()
  })

  return {
    lenis,
    scrollToTop,
    scrollTo,
    refresh
  }
}
