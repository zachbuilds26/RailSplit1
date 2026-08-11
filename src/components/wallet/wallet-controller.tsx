"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConnect, useConnection, useConnectors, useReconnect } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { getRail, type RailKey } from "@/lib/chain";

type WalletPhase = "bootstrapping" | "connecting" | "reconnecting" | "connected" | "disconnected";

type ActiveWallet = {
  phase: WalletPhase;
  address?: `0x${string}`;
  chainId?: number;
  isReady: boolean;
};

type WalletControllerValue = {
  wallet: ActiveWallet;
  openWalletModal: (railKey: RailKey, trigger?: HTMLElement | null) => void;
  closeWalletModal: () => void;
};

const WalletControllerContext = createContext<WalletControllerValue | null>(null);

function isAlreadyConnectedError(error: unknown) {
  return error instanceof Error && /connector already connected/i.test(error.message);
}

export function WalletControllerProvider({ children }: { children: ReactNode }) {
  const connection = useConnection();
  const reconnect = useReconnect();
  const connectors = useConnectors();
  const { connectAsync, isPending, error, reset } = useConnect();
  const [isRestoring, setIsRestoring] = useState(true);
  const [modalRailKey, setModalRailKey] = useState<RailKey>("coston2");
  const [modalOpen, setModalOpen] = useState(false);
  const [connectFailure, setConnectFailure] = useState("");
  const [isConnectionInFlight, setIsConnectionInFlight] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const reconnectStartedRef = useRef(false);
  const connectInFlightRef = useRef(false);

  useEffect(() => {
    if (reconnectStartedRef.current) return;

    reconnectStartedRef.current = true;
    void reconnect.reconnectAsync().catch(() => undefined).finally(() => setIsRestoring(false));
  }, [reconnect]);

  const phase: WalletPhase = isRestoring
    ? "bootstrapping"
    : connection.status === "connected"
      ? "connected"
      : connection.status === "connecting"
        ? "connecting"
        : connection.status === "reconnecting"
          ? "reconnecting"
          : "disconnected";

  const wallet = useMemo<ActiveWallet>(() => ({
    phase,
    address: phase === "connected" ? connection.address : undefined,
    chainId: phase === "connected" ? connection.chainId : undefined,
    isReady: phase === "connected",
  }), [connection.address, connection.chainId, phase]);

  const namedConnectors = connectors.filter((connector) => connector.name !== "Injected");
  const availableConnectors = namedConnectors.length > 0 ? namedConnectors : connectors;
  const uniqueConnectors = availableConnectors.filter(
    (connector, index, list) => list.findIndex((item) => item.uid === connector.uid) === index,
  );

  const closeWalletModal = useCallback(() => {
    if (connectInFlightRef.current) return;
    setModalOpen(false);
  }, []);

  const openWalletModal = useCallback((railKey: RailKey, trigger?: HTMLElement | null) => {
    if (phase !== "disconnected") return;

    focusReturnRef.current = trigger ?? null;
    setModalRailKey(railKey);
    setConnectFailure("");
    reset();
    setModalOpen(true);
  }, [phase, reset]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (modalOpen && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => dialog.focus(), 0);
    }

    if (!modalOpen && dialog.open) {
      dialog.close();
    }
  }, [modalOpen]);

  const handleDialogClose = useCallback(() => {
    if (connectInFlightRef.current) return;

    setModalOpen(false);
    const trigger = focusReturnRef.current;
    focusReturnRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, []);

  const handleConnectorSelect = useCallback(async (connector: (typeof uniqueConnectors)[number]) => {
    if (phase !== "disconnected" || connectInFlightRef.current) return;

    connectInFlightRef.current = true;
    setIsConnectionInFlight(true);
    setConnectFailure("");
    reset();

    try {
      await connectAsync({ connector });
      setModalOpen(false);
    } catch (nextError) {
      if (isAlreadyConnectedError(nextError)) {
        setModalOpen(false);
      } else {
        const message = nextError instanceof Error ? nextError.message : String(nextError);
        if (!/user rejected|user denied/i.test(message)) {
          setConnectFailure(message || "RailSplit could not connect this wallet.");
        }
      }
    } finally {
      connectInFlightRef.current = false;
      setIsConnectionInFlight(false);
    }
  }, [connectAsync, phase, reset]);

  const value = useMemo<WalletControllerValue>(() => ({
    wallet,
    openWalletModal,
    closeWalletModal,
  }), [closeWalletModal, openWalletModal, wallet]);

  const rail = getRail(modalRailKey);
  const pending = isPending || isConnectionInFlight;
  const visibleFailure = connectFailure || (error && !isAlreadyConnectedError(error) ? error.message : "");

  return (
    <WalletControllerContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="wallet-dialog-title"
        aria-describedby="wallet-dialog-description"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          closeWalletModal();
        }}
        onClose={handleDialogClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeWalletModal();
        }}
        tabIndex={-1}
        className="m-auto w-[calc(100%-2.5rem)] max-w-md border border-line bg-background p-0 text-ink backdrop:bg-black/70"
      >
        <div className="border-b border-line bg-background-deep px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Connect wallet</p>
              <h2 id="wallet-dialog-title" className="font-display mt-2 text-2xl tracking-[-0.04em]">Choose your wallet</h2>
            </div>
            <button
              type="button"
              aria-label="Close wallet chooser"
              disabled={pending}
              onClick={closeWalletModal}
              className="grid size-8 place-items-center border border-line text-lg text-muted hover:border-line-strong hover:text-ink disabled:opacity-50"
            >
              ×
            </button>
          </div>
          <p id="wallet-dialog-description" className="mt-3 text-sm leading-6 text-muted">
            Choose a browser wallet to use with {rail.label}. You will approve the connection in that wallet.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {uniqueConnectors.length > 0 ? (
            <div className="grid gap-2">
              {uniqueConnectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  disabled={pending}
                  onClick={() => void handleConnectorSelect(connector)}
                  className="flex items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-left text-sm font-semibold hover:border-line-strong hover:bg-surface-hover disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-3">
                    {connector.icon ? (
                      <img src={connector.icon} alt="" className="size-4" />
                    ) : (
                      <Icon name="wallet" className="size-4 text-accent" />
                    )}
                    {connector.name === "Injected" ? "Browser wallet" : connector.name}
                  </span>
                  <span className="text-xs font-normal text-muted">Connect</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="border border-line bg-background-deep p-4">
              <p className="text-sm">No browser wallet was detected.</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Install MetaMask, Coinbase Wallet, or another EVM wallet, then reload this page.
              </p>
            </div>
          )}

          {pending && (
            <p aria-live="polite" className="mt-4 text-sm text-muted">Waiting for wallet approval…</p>
          )}
          {visibleFailure && (
            <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
              {visibleFailure}
            </p>
          )}
        </div>
      </dialog>
    </WalletControllerContext.Provider>
  );
}

export function useWalletController() {
  const context = useContext(WalletControllerContext);
  if (!context) throw new Error("useWalletController must be used inside WalletControllerProvider.");
  return context;
}
