"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  encodeFunctionData,
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
import { xrplEvmTestnetChain } from "@/lib/chain";
import { XRPL_EVM_PAY_ADDRESS } from "@/lib/xrp-contract-address";
import { isUnknownLinkError } from "@/lib/railsplit-errors";
import { RAILSPLIT_PAY_XRP_ABI } from "@/lib/railsplit-pay-xrp-abi";
import { useXrpSmartAccountExecutor } from "@/lib/xrp-smart-account";

const contract = {
  address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
  abi: RAILSPLIT_PAY_XRP_ABI,
  chainId: xrplEvmTestnetChain.id,
} as const;

export type XrpAccountMode = "eoa" | "smart-account";

export type XrpUsdRate = {
  xrpUsdPrice: bigint;
  quoteDecimals: number;
  updatedAt: bigint;
};

export type XrpPaymentLink = {
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

export type XrpPaymentQuote = {
  railKey: "xrpl-evm-testnet";
  slug: string;
  title: string;
  linkId: `0x${string}`;
  merchant: `0x${string}`;
  priceUsdCents: bigint;
  xrpUsdPrice: bigint;
  requiredWei: bigint;
  issuedAt: bigint;
  validUntil: bigint;
  signature: `0x${string}`;
  quoteDecimals: number;
  chainId: number;
  contractAddress: `0x${string}` | "";
};

export type XrpMerchantLink = {
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

export type XrpSettlementEvent = {
  linkId: `0x${string}`;
  slug: string;
  title: string;
  payer: `0x${string}`;
  amountWei: bigint;
  priceUsdCents: bigint;
  xrpUsdPrice: bigint;
  quoteIssuedAt: bigint;
  quoteValidUntil: bigint;
  paidAt: bigint;
};

export function useXrpPaymentLink(slug: string) {
  const query = useReadContract({
    ...contract,
    functionName: "getPaymentLink",
    args: [slug],
    query: {
      enabled: Boolean(slug) && Boolean(XRPL_EVM_PAY_ADDRESS),
      refetchInterval: 12000,
    },
  });

  return {
    link: query.data as XrpPaymentLink | undefined,
    isLoading: query.isLoading,
    error: query.error,
    notFound: Boolean(query.error && isUnknownLinkError(query.error)),
    refetch: query.refetch,
  };
}

export function useXrpUsdRate() {
  const query = useQuery({
    queryKey: ["railsplit-xrp-rate"],
    refetchInterval: 15000,
    queryFn: async () => {
      const response = await fetch("/api/xrp/rate");
      const data = (await response.json()) as {
        xrpUsdPrice?: string;
        quoteDecimals?: number;
        updatedAt?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The XRP price source is unavailable.");
      }

      return {
        xrpUsdPrice: BigInt(data.xrpUsdPrice ?? "0"),
        quoteDecimals: data.quoteDecimals ?? 8,
        updatedAt: BigInt(data.updatedAt ?? "0"),
      } satisfies XrpUsdRate;
    },
  });

  return {
    rate: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useXrpPaymentQuote(slug: string, enabled = true) {
  const query = useQuery({
    queryKey: ["railsplit-xrp-quote", slug],
    enabled: enabled && Boolean(slug),
    refetchInterval: 15000,
    queryFn: async () => {
      const response = await fetch(`/api/xrp/quote?slug=${encodeURIComponent(slug)}`);
      const data = (await response.json()) as {
        railKey?: "xrpl-evm-testnet";
        slug?: string;
        title?: string;
        linkId?: string;
        merchant?: string;
        priceUsdCents?: string;
        xrpUsdPrice?: string;
        requiredWei?: string;
        issuedAt?: string;
        validUntil?: string;
        signature?: `0x${string}`;
        quoteDecimals?: number;
        chainId?: number;
        contractAddress?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The XRP quote could not be loaded.");
      }

      return {
        railKey: data.railKey ?? "xrpl-evm-testnet",
        slug: data.slug ?? slug,
        title: data.title ?? "Payment",
        linkId: (data.linkId ?? "0x") as `0x${string}`,
        merchant: (data.merchant ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
        priceUsdCents: BigInt(data.priceUsdCents ?? "0"),
        xrpUsdPrice: BigInt(data.xrpUsdPrice ?? "0"),
        requiredWei: BigInt(data.requiredWei ?? "0"),
        issuedAt: BigInt(data.issuedAt ?? "0"),
        validUntil: BigInt(data.validUntil ?? "0"),
        signature: (data.signature ?? "0x") as `0x${string}`,
        quoteDecimals: data.quoteDecimals ?? 8,
        chainId: data.chainId ?? xrplEvmTestnetChain.id,
        contractAddress: (data.contractAddress ?? XRPL_EVM_PAY_ADDRESS) as `0x${string}` | "",
      } satisfies XrpPaymentQuote;
    },
  });

  return {
    quote: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useXrpPayLink(slug: string, mode: XrpAccountMode = "eoa") {
  const { address } = useAccount();
  const { writeContractAsync, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const smartAccount = useXrpSmartAccountExecutor();
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const transactionReceipt = useWaitForTransactionReceipt({
    hash,
    chainId: xrplEvmTestnetChain.id,
  });

  const smartReceipt = smartAccount.status.data?.receipts?.[0];

  const pay = useCallback(
    async (quote: XrpPaymentQuote) => {
      if (!XRPL_EVM_PAY_ADDRESS) {
        throw new Error("XRP has not been deployed yet.");
      }

      if (!address) {
        throw new Error("Connect a wallet first.");
      }

      setHash(undefined);
      smartAccount.clear();
      reset();

      const args = [quote.slug, quote.xrpUsdPrice, quote.issuedAt, quote.validUntil, quote.signature] as const;

      if (mode === "smart-account") {
        const call = {
          to: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
          data: encodeFunctionData({
            abi: RAILSPLIT_PAY_XRP_ABI,
            functionName: "pay",
            args,
          }),
          value: quote.requiredWei,
        } as const;

        await smartAccount.submitCalls({
          account: address,
          chainId: xrplEvmTestnetChain.id,
          calls: [call],
        });
        return smartAccount.callsId;
      }

      const txHash = await writeContractAsync({
        ...contract,
        functionName: "pay",
        args,
        value: quote.requiredWei,
      });

      setHash(txHash);
      return txHash;
    },
    [address, mode, reset, smartAccount, writeContractAsync],
  );

  const clear = useCallback(() => {
    setHash(undefined);
    smartAccount.clear();
    reset();
  }, [reset, smartAccount]);

  const receipt = mode === "smart-account" ? smartReceipt : transactionReceipt.data;
  const receiptLogs = useMemo(
    () => (receipt?.logs ?? []) as unknown as Parameters<typeof parseEventLogs>[0]["logs"],
    [receipt],
  );

  const validation = useMemo(() => {
    if (mode === "smart-account" && !smartReceipt) {
      return { status: "checking" as const };
    }

    if (mode !== "smart-account" && hash && transactionReceipt.isError) {
      return {
        status: "invalid" as const,
        message: transactionReceipt.error?.message ?? "The XRP payment could not be confirmed.",
      };
    }

    if (!receipt) {
      return { status: "idle" as const };
    }

    if ((mode === "smart-account" ? smartAccount.status.isError : transactionReceipt.isError) || !receiptLogs.length) {
      return {
        status: "invalid" as const,
        message: "The mined transaction did not pay this XRP link.",
      };
    }

    try {
      const paymentEvents = parseEventLogs({
        abi: RAILSPLIT_PAY_XRP_ABI,
        eventName: "PaymentReceived",
        logs: receiptLogs,
      });
      const expectedLinkId = keccak256(stringToHex(slug));
      const paymentEvent = paymentEvents.find(
        (event) =>
          event.address.toLowerCase() === XRPL_EVM_PAY_ADDRESS.toLowerCase() &&
          event.args.linkId === expectedLinkId,
      );

      if (!paymentEvent) {
        return {
          status: "invalid" as const,
          message: "The mined transaction did not pay this XRP link.",
        };
      }

      return { status: "valid" as const };
    } catch {
      return {
        status: "invalid" as const,
        message: "The mined transaction did not pay this XRP link.",
      };
    }
  }, [hash, mode, receipt, receiptLogs, slug, smartAccount.status.isError, smartReceipt, transactionReceipt.error, transactionReceipt.isError]);

  const transactionHash = mode === "smart-account" ? smartReceipt?.transactionHash : hash;
  const isSubmitting = mode === "smart-account" ? smartAccount.isSubmitting : isWritePending;
  const isConfirming =
    mode === "smart-account"
      ? Boolean(smartAccount.callsId) && (smartAccount.status.isLoading || !smartReceipt)
      : Boolean(hash) && (transactionReceipt.isLoading || validation.status === "checking");
  const isConfirmed = (mode === "smart-account" ? smartAccount.status.isSuccess : transactionReceipt.isSuccess) && validation.status === "valid";

  const combinedError =
    writeError ??
    smartAccount.error ??
    transactionReceipt.error ??
    smartAccount.status.error ??
    (validation.status === "invalid" ? new Error(validation.message) : undefined);

  return {
    pay,
    clear,
    hash: transactionHash,
    smartAccountId: smartAccount.callsId,
    isSubmitting,
    isConfirming,
    isConfirmed,
    error: combinedError,
  };
}

export function useXrpMerchantLedger(merchantAddress?: `0x${string}`) {
  const client = usePublicClient({ chainId: xrplEvmTestnetChain.id });

  const query = useQuery({
    queryKey: ["railsplit-xrp-ledger", XRPL_EVM_PAY_ADDRESS || "none", merchantAddress ?? "none"],
    enabled: Boolean(client && merchantAddress && XRPL_EVM_PAY_ADDRESS),
    refetchInterval: 15000,
    queryFn: async () => {
      if (!client || !merchantAddress || !XRPL_EVM_PAY_ADDRESS) {
        throw new Error("No XRP merchant wallet connected");
      }

      const merchantLinkTotal = (await client.readContract({
        address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
        abi: RAILSPLIT_PAY_XRP_ABI,
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
              address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
              abi: RAILSPLIT_PAY_XRP_ABI,
              functionName: "merchantLinkIdAt",
              args: [merchantAddress, merchantLinkTotal - 1n - BigInt(index)],
            }) as Promise<`0x${string}`>,
          ),
        ),
        client.readContract({
          address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
          abi: RAILSPLIT_PAY_XRP_ABI,
          functionName: "paymentCount",
        }) as Promise<bigint>,
      ]);

      const rawLinks = await Promise.all(
        merchantLinkIds.map((linkId) =>
          client.readContract({
            address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
            abi: RAILSPLIT_PAY_XRP_ABI,
            functionName: "getPaymentLinkById",
            args: [linkId],
          }) as Promise<XrpPaymentLink & { slug: string }>,
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
      const payments = await scanPayments(client, linkById, paymentTotal);

      return { links, payments };
    },
  });

  return {
    links: query.data?.links ?? [],
    payments: query.data?.payments ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

const PAYMENTS_PER_PAGE = 50n;
const PAYMENTS_COLLECT_LIMIT = 6;
const MAX_PAGES = 10;

async function scanPayments(
  client: PublicClient,
  linkById: Map<`0x${string}`, XrpMerchantLink>,
  paymentTotal?: bigint,
) {
  const payments: XrpSettlementEvent[] = [];
  let offset = 0n;
  let pagesRead = 0;
  const total =
    paymentTotal ??
    ((await client.readContract({
      address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
      abi: RAILSPLIT_PAY_XRP_ABI,
      functionName: "paymentCount",
    })) as bigint);

  while (offset < total && payments.length < PAYMENTS_COLLECT_LIMIT && pagesRead < MAX_PAGES) {
    pagesRead += 1;
    const pageLimit = total - offset < PAYMENTS_PER_PAGE ? total - offset : PAYMENTS_PER_PAGE;
    const [rawPayments, paymentSlugs] = (await client.readContract({
      address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
      abi: RAILSPLIT_PAY_XRP_ABI,
      functionName: "getPayments",
      args: [offset, pageLimit],
    })) as readonly [readonly {
      linkId: `0x${string}`;
      payer: `0x${string}`;
      amountWei: bigint;
      priceUsdCents: bigint;
      xrpUsdPrice: bigint;
      quoteIssuedAt: bigint;
      quoteValidUntil: bigint;
      paidAt: bigint;
    }[], readonly string[], bigint];

    if (rawPayments.length === 0) break;

    for (let index = 0; index < rawPayments.length && payments.length < PAYMENTS_COLLECT_LIMIT; index++) {
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
        xrpUsdPrice: payment.xrpUsdPrice,
        quoteIssuedAt: payment.quoteIssuedAt,
        quoteValidUntil: payment.quoteValidUntil,
        paidAt: payment.paidAt,
      });
    }

    offset += BigInt(rawPayments.length);
  }

  return payments;
}

export function quoteUsdCentsToXrpWei(
  priceUsdCents: bigint,
  xrpUsdPrice: bigint | undefined,
  xrpUsdDecimals = 8,
) {
  if (xrpUsdPrice === undefined || xrpUsdPrice === 0n) {
    return undefined;
  }

  const scaledCents = priceUsdCents * 10n ** 16n;
  return (scaledCents * 10n ** BigInt(xrpUsdDecimals)) / xrpUsdPrice;
}
