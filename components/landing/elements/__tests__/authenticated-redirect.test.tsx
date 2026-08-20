import type { Mock } from "vitest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { Window } from "happy-dom"
import * as authClient from "@/lib/auth/auth-client"

if (typeof globalThis.window === "undefined") {
  const windowInstance = new Window()
  windowInstance.document.write("<!DOCTYPE html><html><body></body></html>")
  globalThis.window = windowInstance as unknown as typeof globalThis.window
  globalThis.document = windowInstance.document as unknown as Document
  globalThis.HTMLElement = windowInstance.HTMLElement as unknown as typeof globalThis.HTMLElement
  globalThis.navigator = windowInstance.navigator as unknown as typeof globalThis.navigator
  globalThis.customElements = windowInstance.customElements as unknown as typeof globalThis.customElements
  globalThis.Node = windowInstance.Node as unknown as typeof globalThis.Node
  globalThis.MutationObserver = windowInstance.MutationObserver as unknown as typeof globalThis.MutationObserver
  globalThis.screen = windowInstance.screen as unknown as typeof globalThis.screen

  if (!globalThis.document.body) {
    const bodyElement = globalThis.document.createElement("body")
    if (globalThis.document.documentElement) {
      globalThis.document.documentElement.appendChild(bodyElement)
    } else {
      globalThis.document.appendChild(bodyElement as unknown as Node)
    }
  }
}

await import("@testing-library/jest-dom/vitest")

const { render, waitFor } = await import("@testing-library/react")

import { AuthenticatedRedirect } from "../authenticated-redirect"

const replaceMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

const useSessionMock = vi.spyOn(authClient, "useSession") as unknown as Mock

describe("AuthenticatedRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionMock.mockImplementation(() => ({ data: null }))
  })

  test("no redirige cuando no existe sesión", () => {
    render(<AuthenticatedRedirect />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  test("redirige a organizations cuando hay sesión", async () => {
    useSessionMock.mockImplementation(() => ({
      data: { user: { id: "user-1" } },
    }))

    render(<AuthenticatedRedirect />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/organizations")
    })
  })
})
