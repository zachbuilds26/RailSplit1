"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, keccak256, parseEventLogs, stringToHex } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { railsplitChain } from "@/lib/chain";
import { RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";
import { isUnknownLinkError, withQuoteBuffer } from "@/lib/railsplit-errors";
import { RAILSPLIT_PAY_ABI } from "@/lib/railsplit-pay-abi";

const contract = {
  address: RAILSPLIT_PAY_ADDRESS,
  abi: RAILSPLIT_PAY_ABI,
  chainId: railsplitChain.id,
} as const;

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

/** Total number of links on the contract. */
export function useLinkCount() {
  const query = useReadContract({
    ...contract,
    functionName: "linkCount",
  });

  return { count: query.data as bigint | undefined, isLoading: query.isLoading };
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
  flrUsdPrice: bigint;
  flrUsdDecimals: number;
};

/**
 * Reads the connected merchant's payment links and settled payments.
 *
 * Links can be queried directly by merchant, which keeps the dashboard from
 * pulling the entire chain just to render one wallet's view.
 */
export function useMerchantLedger(merchantAddress?: `0x${string}`) {
  const client = usePublicClient({ chainId: railsplitChain.id });

  const query = useQuery({
    queryKey: ["railsplit-ledger", RAILSPLIT_PAY_ADDRESS, merchantAddress ?? "none"],
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
        return { links: [], payments: [], paymentHistoryCapped: false };
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
      const payments: SettlementEvent[] = [];
      let paymentOffset = 0n;
      let paymentHistoryCapped = false;

      while (paymentOffset < paymentTotal && payments.length < 50) {
        const pageLimit = paymentTotal - paymentOffset < 50n ? paymentTotal - paymentOffset : 50n;
        const [rawPayments, paymentSlugs] = (await client.readContract({
          address: RAILSPLIT_PAY_ADDRESS,
          abi: RAILSPLIT_PAY_ABI,
          functionName: "getPayments",
          args: [paymentOffset, pageLimit],
        })) as readonly [readonly ContractPayment[], readonly string[], bigint];

        if (rawPayments.length === 0) break;

        for (let index = 0; index < rawPayments.length && payments.length < 50; index++) {
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
            flrUsdPrice: payment.flrUsdPrice,
            flrUsdDecimals: Number(payment.flrUsdDecimals),
          });
        }

        paymentOffset += BigInt(rawPayments.length);
      }

      if (payments.length >= 50 && paymentOffset < paymentTotal) {
        paymentHistoryCapped = true;
      }

      return { links, payments, paymentHistoryCapped };
    },
  });

  return {
    links: query.data?.links ?? [],
    payments: query.data?.payments ?? [],
    paymentHistoryCapped: query.data?.paymentHistoryCapped ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
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
