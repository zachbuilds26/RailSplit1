"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatEther,
  formatUnits,
  keccak256,
  parseEventLogs,
  stringToHex,
  type PublicClient,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt as wagmiWaitForTransactionReceipt } from "wagmi/actions";
import { railsplitChain, wagmiConfig } from "@/lib/chain";
import { RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";
import { isUnknownLinkError, withQuoteBuffer } from "@/lib/railsplit-errors";
import { RAILSPLIT_PAY_ABI } from "@/lib/railsplit-pay-abi";
import { FXRP } from "@/lib/rails";

const contract = {
  address: RAILSPLIT_PAY_ADDRESS,
  abi: RAILSPLIT_PAY_ABI,
  chainId: railsplitChain.id,
} as const;

/** Settlement asset from the contract: 0 = native C2FLR, 1 = FXRP. */
export type SettlementAsset = 0 | 1;

export function assetSymbol(asset: SettlementAsset | undefined) {
  return asset === 1 ? FXRP.symbol : railsplitChain.nativeCurrency.symbol;
}

/** Formats a base-unit amount for a given asset (6 decimals for FXRP, 18 for C2FLR). */
export function formatAssetAmount(value: bigint | undefined, asset: SettlementAsset | undefined, maximumFractionDigits = 4) {
  if (value === undefined) return "—";
  return asset === 1
    ? Number(formatUnits(value, FXRP.decimals)).toLocaleString("en-US", { maximumFractionDigits })
    : formatCoin(value, maximumFractionDigits);
}

export type OnchainLink = {
  merchant: `0x${string}`;
  priceUsdCents: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  active: boolean;
  paymentCount: number;
  totalReceivedWei: bigint;
  totalReceivedUsdCents: bigint;
  title: string;
};

/** Reads one payment link from the contract by its public slug. */
export function usePaymentLink(slug: string) {
  const query = useReadContract({
    ...contract,
    functionName: "getPaymentLink",
    args: [slug],
    query: {
      enabled: Boolean(slug),
      refetchInterval: 12000,
    },
  });

  return {
    link: query.data as OnchainLink | undefined,
    isLoading: query.isLoading,
    error: query.error,
    notFound: Boolean(query.error && isUnknownLinkError(query.error)),
    refetch: query.refetch,
  };
}

/**
 * Live quote for a link, refreshed on a timer.
 *
 * The FLR/USD rate moves, so the coin amount due moves with it. Re-reading
 * keeps the figure on screen close to what the contract will charge.
 */
export function usePaymentQuote(slug: string, enabled = true) {
  const query = useReadContract({
    ...contract,
    functionName: "quote",
    args: [slug],
    query: {
      enabled: enabled && Boolean(slug),
      refetchInterval: 12000,
    },
  });

  const data = query.data as
    | readonly [bigint, bigint, number, bigint]
    | undefined;

  return {
    requiredWei: data?.[0],
    flrUsdPrice: data?.[1],
    flrUsdDecimals: data?.[2],
    feedTimestamp: data?.[3],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Sends a payment.
 *
 * A small buffer is added on top of the quoted amount because the rate can
 * move between reading the quote and the transaction being mined. The
 * contract charges only the rate at mining time and returns the rest, so the
 * buffer costs the customer nothing.
 */
export function usePayLink(slug: string) {
  const { address } = useAccount();
  const { writeContractAsync, isPending, error, reset } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: railsplitChain.id,
  });

  const pay = useCallback(
    async (requiredWei: bigint) => {
      const value = withQuoteBuffer(requiredWei);
      reset();
      setHash(undefined);

      const txHash = await writeContractAsync({
        ...contract,
        functionName: "pay",
        args: [slug],
        value,
      });

      setHash(txHash);
      return txHash;
    },
    [reset, slug, writeContractAsync],
  );

  const clear = useCallback(() => {
    setHash(undefined);
    reset();
  }, [reset]);

  const validation = useMemo(() => {
    if (!hash) return { status: "idle" as const };

    if (receipt.isError) {
      return {
        status: "invalid" as const,
        message: receipt.error?.message ?? "The transaction could not be confirmed.",
      };
    }

    if (receipt.isLoading || !receipt.data) {
      return { status: "checking" as const };
    }

    try {
      const expectedLinkId = keccak256(stringToHex(slug));
      const paymentEvents = parseEventLogs({
        abi: RAILSPLIT_PAY_ABI,
        eventName: "PaymentReceived",
        logs: receipt.data.logs,
      });
      const paymentEvent = paymentEvents.find(
        (event) =>
          event.address.toLowerCase() === contract.address.toLowerCase() &&
          event.args.linkId === expectedLinkId,
      );

      if (!paymentEvent) {
        return {
          status: "invalid" as const,
          message: "The mined transaction did not pay this link.",
        };
      }

      return { status: "valid" as const };
    } catch {
      return {
        status: "invalid" as const,
        message: "The mined transaction did not pay this link.",
      };
    }
  }, [hash, receipt.data, receipt.error, receipt.isError, receipt.isLoading, slug]);

  const isConfirmed = receipt.isSuccess && validation.status === "valid";
  const isConfirming = Boolean(hash) && (receipt.isLoading || validation.status === "checking");
  const validationError = validation.status === "invalid" ? new Error(validation.message) : undefined;

  return {
    pay,
    clear,
    hash,
    address,
    isSubmitting: isPending,
    isConfirming,
    isConfirmed,
    error: error ?? receipt.error ?? validationError,
  };
}

/**
 * Live FXRP quote for a link, refreshed on a timer.
 *
 * FXRP is the FAsset representation of XRP on Flare. The XRP/USD rate moves,
 * so the FXRP amount due moves with it. Re-reading keeps the figure on screen
 * close to what the contract will charge.
 */
export function usePaymentQuoteFxrp(slug: string, enabled = true) {
  const query = useReadContract({
    ...contract,
    functionName: "quoteFxrp",
    args: [slug],
    query: {
      enabled: enabled && Boolean(slug),
      refetchInterval: 12000,
    },
  });

  const data = query.data as
    | readonly [bigint, bigint, number, bigint]
    | undefined;

  return {
    requiredFxrp: data?.[0],
    xrpUsdPrice: data?.[1],
    xrpUsdDecimals: data?.[2],
    feedTimestamp: data?.[3],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Sends a payment in FXRP.
 *
 * The payer must first approve the contract to spend their FXRP, then this
 * pulls the quoted amount plus a buffer and forwards the converted price to
 * the merchant, refunding the surplus in the same transaction.
 */
export function usePayLinkFxrp(slug: string) {
  const { address } = useAccount();
  const {
    writeContractAsync: writeApprove,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();
  const {
    writeContractAsync: writePay,
    isPending: payPending,
    error: payError,
    reset: resetPay,
  } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: railsplitChain.id,
  });

  // How much FXRP the contract is allowed to pull for this payer.
  const allowance = useReadContract({
    abi: [
      {
        type: "function",
        name: "allowance",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    address: FXRP.address,
    functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", RAILSPLIT_PAY_ADDRESS],
    chainId: railsplitChain.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 12000,
    },
  });

  const pay = useCallback(
    async (requiredFxrp: bigint) => {
      const value = withQuoteBuffer(requiredFxrp);
      resetPay();
      resetApprove();
      setHash(undefined);

      // Approve only if the existing allowance cannot cover the amount.
      const existingAllowance = allowance.data as bigint | undefined;
      if (existingAllowance === undefined || existingAllowance < value) {
        const approveTx = await writeApprove({
          address: FXRP.address,
          abi: [
            {
              type: "function",
              name: "approve",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [RAILSPLIT_PAY_ADDRESS, value],
          chainId: railsplitChain.id,
        });
        await wagmiWaitForTransactionReceipt(wagmiConfig, {
          hash: approveTx,
          confirmations: 1,
          timeout: 60_000,
        });
      }

      const txHash = await writePay({
        ...contract,
        functionName: "payFxrp",
        args: [slug, value],
      });

      setHash(txHash);
      return txHash;
    },
    [allowance.data, resetApprove, resetPay, slug, writeApprove, writePay],
  );

  const clear = useCallback(() => {
    setHash(undefined);
    resetPay();
    resetApprove();
  }, [resetPay, resetApprove]);

  return {
    pay,
    clear,
    hash,
    address,
    isSubmitting: approvePending || payPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: approveError ?? payError ?? receipt.error,
  };
}

export type PaymentReceipt = {
  linkId: `0x${string}`;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  amountWei: bigint;
  priceUsdCents: bigint;
  flrUsdPrice: bigint;
  flrUsdDecimals: number;
  feedTimestamp: bigint;
  paidAt: bigint;
  hash: `0x${string}`;
  blockNumber: bigint;
  asset: SettlementAsset;
};

/**
 * Rebuilds a settled payment from on-chain data alone, keyed by the
 * transaction hash that paid `slug`'s link.
 *
 * The receipt page is URL-addressable, so it has no indexer or local storage
 * to lean on: the tx receipt carries the PaymentReceived event (amount, rate,
 * merchant, payer) and the block carries the settlement timestamp.
 */
export function usePaymentReceipt(slug: string, txHash: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: railsplitChain.id });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: railsplitChain.id,
  });

  const block = useQuery({
    queryKey: ["railsplit-receipt-block", txHash, String(receipt.data?.blockNumber ?? 0n)],
    enabled: Boolean(txHash && receipt.data?.blockNumber && client),
    queryFn: async () => {
      if (!client || !receipt.data?.blockNumber) {
        throw new Error("No transaction block available.");
      }
      return client.getBlock({ blockNumber: receipt.data.blockNumber });
    },
  });

  const validation = useMemo(() => {
    if (!txHash) return { status: "idle" as const };

    if (receipt.isError || !receipt.data) {
      return {
        status: "invalid" as const,
        message: "This transaction could not be confirmed.",
      };
    }

    if (receipt.isLoading) {
      return { status: "checking" as const };
    }

    try {
      const expectedLinkId = keccak256(stringToHex(slug));
      const paymentEvents = parseEventLogs({
        abi: RAILSPLIT_PAY_ABI,
        eventName: "PaymentReceived",
        logs: receipt.data.logs,
      });
      const paymentEvent = paymentEvents.find(
        (event) =>
          event.address.toLowerCase() === contract.address.toLowerCase() &&
          event.args.linkId === expectedLinkId,
      );

      if (!paymentEvent) {
        return {
          status: "invalid" as const,
          message: "This transaction did not pay this link.",
        };
      }

      return { status: "valid" as const, event: paymentEvent };
    } catch {
      return {
        status: "invalid" as const,
        message: "This transaction did not pay this link.",
      };
    }
  }, [txHash, slug, receipt.isError, receipt.isLoading, receipt.data]);

  const payment =
    validation.status === "valid"
      ? ({
          linkId: validation.event.args.linkId,
          merchant: validation.event.args.merchant,
          payer: validation.event.args.payer,
          amountWei: validation.event.args.amountWei,
          priceUsdCents: validation.event.args.priceUsdCents,
          flrUsdPrice: validation.event.args.feedUsdPrice,
          flrUsdDecimals: Number(validation.event.args.feedUsdDecimals),
          feedTimestamp: validation.event.args.feedTimestamp,
          paidAt: block.data?.timestamp ?? 0n,
          hash: txHash as `0x${string}`,
          blockNumber: receipt.data?.blockNumber ?? 0n,
          asset: Number(validation.event.args.asset) as SettlementAsset,
        } satisfies PaymentReceipt)
      : undefined;

  return {
    payment,
    isLoading:
      Boolean(txHash) &&
      (receipt.isLoading || validation.status === "checking" || block.isLoading),
    isConfirmed: receipt.isSuccess && validation.status === "valid",
    error: receipt.error ?? block.error ?? (validation.status === "invalid" ? new Error(validation.message) : undefined),
  };
}

export type MerchantLink = {
  linkId: `0x${string}`;
  slug: string;
  title: string;
  priceUsdCents: bigint;
  merchant: `0x${string}`;
  expiresAt: bigint;
  active: boolean;
  paymentCount: number;
  totalReceivedWei: bigint;
  totalReceivedUsdCents: bigint;
};

export type SettlementEvent = {
  linkId: `0x${string}`;
  slug: string;
  title: string;
  payer: `0x${string}`;
  amountWei: bigint;
  priceUsdCents: bigint;
  paidAt: bigint;
  flrUsdPrice: bigint;
  flrUsdDecimals: number;
  asset: SettlementAsset;
};

type ContractLink = {
  merchant: `0x${string}`;
  priceUsdCents: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  active: boolean;
  paymentCount: number;
  totalReceivedWei: bigint;
  totalReceivedUsdCents: bigint;
  title: string;
  slug: string;
};

type ContractPayment = {
  linkId: `0x${string}`;
  payer: `0x${string}`;
  amountWei: bigint;
  priceUsdCents: bigint;
  paidAt: bigint;
  feedUsdPrice: bigint;
  feedUsdDecimals: number;
  asset: number;
};

/**
 * Reads the connected merchant's payment links and settled payments.
 *
 * Links can be queried directly by merchant, which keeps the dashboard from
 * pulling the entire chain just to render one wallet's view. Settlement
 * history is walked backward from the newest global payment in bounded pages
 * until the latest few for this merchant are found. A larger `collectLimit`
 * walks further back on demand (the dashboard's "load more"), so a busy
 * merchant is not permanently capped at the first batch.
 */
export function useMerchantLedger(
  merchantAddress?: `0x${string}`,
  options?: { collectLimit?: number },
) {
  const client = usePublicClient({ chainId: railsplitChain.id });
  const collectLimit = options?.collectLimit ?? PAYMENTS_COLLECT_LIMIT;

  const query = useQuery({
    queryKey: [
      "railsplit-ledger",
      RAILSPLIT_PAY_ADDRESS,
      merchantAddress ?? "none",
      collectLimit,
    ],
    enabled: Boolean(client && merchantAddress),
    refetchInterval: 15000,
    queryFn: async () => {
      if (!client || !merchantAddress) throw new Error("No merchant wallet connected");

      const merchantLinkTotal = (await client.readContract({
        address: RAILSPLIT_PAY_ADDRESS,
        abi: RAILSPLIT_PAY_ABI,
        functionName: "merchantLinkCount",
        args: [merchantAddress],
      })) as bigint;

      if (merchantLinkTotal === 0n) {
        return { links: [], payments: [] };
      }

      const [merchantLinkIds, paymentTotal] = await Promise.all([
        Promise.all(
          Array.from({ length: Number(merchantLinkTotal) }, (_, index) =>
            client.readContract({
              address: RAILSPLIT_PAY_ADDRESS,
              abi: RAILSPLIT_PAY_ABI,
              functionName: "merchantLinkIdAt",
              args: [merchantAddress, merchantLinkTotal - 1n - BigInt(index)],
            }) as Promise<`0x${string}`>,
          ),
        ),
        client.readContract({
          address: RAILSPLIT_PAY_ADDRESS,
          abi: RAILSPLIT_PAY_ABI,
          functionName: "paymentCount",
        }) as Promise<bigint>,
      ]);

      const rawLinks = await Promise.all(
        merchantLinkIds.map((linkId) =>
          client.readContract({
            address: RAILSPLIT_PAY_ADDRESS,
            abi: RAILSPLIT_PAY_ABI,
            functionName: "getPaymentLinkById",
            args: [linkId],
          }) as Promise<ContractLink>,
        ),
      );

      const links = rawLinks.map((link, index) => ({
        linkId: merchantLinkIds[index],
        slug: link.slug,
        title: link.title,
        priceUsdCents: link.priceUsdCents,
        merchant: link.merchant,
        expiresAt: link.expiresAt,
        active: link.active,
        paymentCount: Number(link.paymentCount),
        totalReceivedWei: link.totalReceivedWei,
        totalReceivedUsdCents: link.totalReceivedUsdCents,
      }));

      const linkById = new Map(links.map((link) => [link.linkId, link] as const));
      const { payments, hasMore } = await scanPayments(client, linkById, paymentTotal, collectLimit);

      return { links, payments, hasMore };
    },
  });

  return {
    links: query.data?.links ?? [],
    payments: query.data?.payments ?? [],
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

const PAYMENTS_PER_PAGE = 50n;
export const PAYMENTS_COLLECT_LIMIT = 6;
const MAX_PAGES = 20;

/**
 * Walks the global payments array backward from the newest, collecting up to
 * `collectLimit` payments that belong to links in `linkById`. The walk is
 * bounded to `MAX_PAGES` RPC reads so a dashboard refetch cannot fan out into
 * an unbounded number of calls as unrelated payments accumulate.
 *
 * `hasMore` reports whether the walk stopped before reaching the start of the
 * array, so the UI can offer to fetch a deeper batch.
 */
async function scanPayments(
  client: PublicClient,
  linkById: Map<`0x${string}`, MerchantLink>,
  paymentTotal: bigint,
  collectLimit: number,
) {
  const payments: SettlementEvent[] = [];
  let offset = 0n;
  let pagesRead = 0;
  const total = paymentTotal;

  while (offset < total && payments.length < collectLimit && pagesRead < MAX_PAGES) {
    pagesRead += 1;
    const pageLimit = total - offset < PAYMENTS_PER_PAGE ? total - offset : PAYMENTS_PER_PAGE;
    const [rawPayments, paymentSlugs] = (await client.readContract({
      address: RAILSPLIT_PAY_ADDRESS,
      abi: RAILSPLIT_PAY_ABI,
      functionName: "getPayments",
      args: [offset, pageLimit],
    })) as readonly [readonly ContractPayment[], readonly string[], bigint];

    if (rawPayments.length === 0) break;

    for (let index = 0; index < rawPayments.length && payments.length < collectLimit; index++) {
      const payment = rawPayments[index];
      const link = linkById.get(payment.linkId);
      if (!link) continue;

      const slug = paymentSlugs[index] ?? link.slug;
      payments.push({
        linkId: link.linkId,
        slug,
        title: link.title,
        payer: payment.payer,
        amountWei: payment.amountWei,
        priceUsdCents: payment.priceUsdCents,
        paidAt: payment.paidAt,
        flrUsdPrice: payment.feedUsdPrice,
        flrUsdDecimals: Number(payment.feedUsdDecimals),
        asset: Number(payment.asset) as SettlementAsset,
      });
    }

    offset += BigInt(rawPayments.length);
  }

  const stoppedEarly =
    (payments.length >= collectLimit || pagesRead >= MAX_PAGES) && offset < total;

  return { payments, hasMore: stoppedEarly };
}

/** Reads the live FLR/USD feed straight from the contract. */
export function useFlrUsdFeed() {
  const query = useReadContract({
    ...contract,
    functionName: "flrUsdFeed",
    query: { refetchInterval: 12000 },
  });

  const data = query.data as readonly [bigint, number, bigint] | undefined;

  return {
    value: data?.[0],
    decimals: data?.[1],
    timestamp: data?.[2],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Reads the live XRP/USD feed straight from the contract. */
export function useXrpUsdFeed() {
  const query = useReadContract({
    ...contract,
    functionName: "xrpUsdFeed",
    query: { refetchInterval: 12000 },
  });

  const data = query.data as readonly [bigint, number, bigint] | undefined;

  return {
    value: data?.[0],
    decimals: data?.[1],
    timestamp: data?.[2],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Formats a wei amount for display, trimming to a readable precision. */
export function formatCoin(wei: bigint | undefined, maximumFractionDigits = 4) {
  if (wei === undefined) return "—";

  return Number(formatEther(wei)).toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

/** Formats US cents as a dollar string. */
export function formatUsdCents(cents: bigint | number | undefined) {
  if (cents === undefined) return "—";

  return (Number(cents) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/** Turns a raw FTSO value and its decimals into a readable USD rate. */
export function formatFeedPrice(value: bigint | undefined, decimals: number | undefined) {
  if (value === undefined || decimals === undefined) return "—";
  return `$${(Number(value) / 10 ** Number(decimals)).toFixed(6)}`;
}

export function quoteUsdCentsToWei(
  priceUsdCents: bigint,
  flrUsdPrice: bigint | undefined,
  flrUsdDecimals: number | undefined,
) {
  if (flrUsdPrice === undefined || flrUsdPrice === 0n || flrUsdDecimals === undefined) {
    return undefined;
  }

  const scaledCents = priceUsdCents * 10n ** 16n;

  if (flrUsdDecimals >= 0) {
    return (scaledCents * 10n ** BigInt(flrUsdDecimals)) / flrUsdPrice;
  }

  return scaledCents / (flrUsdPrice * 10n ** BigInt(-flrUsdDecimals));
}

/**
 * Converts US cents to FXRP base units (6 decimals on Coston2) at the live
 * XRP/USD feed rate. Mirrors the contract's `_requiredAmount` for FXRP.
 */
export function quoteUsdCentsToFxrp(
  priceUsdCents: bigint,
  xrpUsdPrice: bigint | undefined,
  xrpUsdDecimals: number | undefined,
) {
  if (xrpUsdPrice === undefined || xrpUsdPrice === 0n || xrpUsdDecimals === undefined) {
    return undefined;
  }

  const scaledCents = priceUsdCents * 10n ** BigInt(FXRP.decimals - 2);

  if (xrpUsdDecimals >= 0) {
    return (scaledCents * 10n ** BigInt(xrpUsdDecimals)) / xrpUsdPrice;
  }

  return scaledCents / (xrpUsdPrice * 10n ** BigInt(-xrpUsdDecimals));
}

/**
 * Current unix time as state, ticking once a second.
 *
 * Expiry is time-dependent, so reading the clock during render would leave a
 * link showing as active until something unrelated forced a re-render. This
 * keeps the value in state so the view updates on its own. It starts
 * undefined so the server and the first client render agree.
 */
export function useNow() {
  const [now, setNow] = useState<bigint | undefined>();

  useEffect(() => {
    const id = window.setInterval(
      () => setNow(BigInt(Math.floor(Date.now() / 1000))),
      1000,
    );

    // Set straight away too, so the first value does not wait a full second.
    const frame = window.requestAnimationFrame(() =>
      setNow(BigInt(Math.floor(Date.now() / 1000))),
    );

    return () => {
      window.clearInterval(id);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return now;
}

/** True when a link has passed its expiry. Unknown until the clock starts. */
export function isExpired(expiresAt: bigint, now: bigint | undefined) {
  if (now === undefined) return false;
  return expiresAt !== 0n && now > expiresAt;
}

/** Seconds since the feed last updated, recomputed on a timer. */
export function useFeedAge(feedTimestamp: bigint | undefined) {
  const now = useNow();

  if (feedTimestamp === undefined || now === undefined) return undefined;

  return Math.max(0, Number(now - feedTimestamp));
}
