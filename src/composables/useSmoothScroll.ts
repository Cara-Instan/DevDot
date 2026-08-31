import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import Lenis from 'lenis'
import { useSettingsStore } from '@/stores/settings'

export interface UseSmoothScrollOptions {
  wrapperRef: Ref<HTMLElement | null>
  contentRef?: Ref<HTMLElement | null>
}

function shouldPreventSmoothScroll(node: HTMLElement, wrapper: HTMLElement): boolean {
  if (!node || !(node instanceof HTMLElement)) return false

  // 1. Explicit data-lenis-prevent opt-outs
  if (
    node.hasAttribute('data-lenis-prevent') ||
    node.hasAttribute('data-lenis-prevent-wheel') ||
    node.hasAttribute('data-lenis-prevent-touch') ||
    node.closest('[data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch]')
  ) {
    return true
  }

  // 2. CodeMirror editors, scrollers, search panels, and code editor containers
  if (
    node.closest(
      '.cm-editor, .cm-scroller, .cm-content, .codemirror-wrapper, .m3-code-editor-container, .cm-panel, .cm-search'
    )
  ) {
    return true
  }

  // 3. Native interactive text/input controls and pre/code blocks
  if (node.closest('textarea, input, select, pre, code, md-outlined-text-field, md-filled-text-field')) {
    return true
  }

  // 4. Traverse up to check if any nested container has its own scrollable overflow
  let curr: HTMLElement | null = node
  while (curr && curr !== wrapper && curr !== document.body && curr !== document.documentElement) {
    if (curr.hasAttribute('data-lenis-prevent')) return true

    try {
      const style = window.getComputedStyle(curr)
      const isScrollableY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        curr.scrollHeight > curr.clientHeight
      const isScrollableX =
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        curr.scrollWidth > curr.clientWidth

      if (isScrollableY || isScrollableX) {
        return true
      }
    } catch {
      // Ignore getComputedStyle errors on detached elements
    }

    curr = curr.parentElement
  }

  return false
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
        infinite: false,
        allowNestedScroll: true,
        prevent: (node: HTMLElement) => shouldPreventSmoothScroll(node, wrapper)
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
