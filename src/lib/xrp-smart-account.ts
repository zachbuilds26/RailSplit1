"use client";

import { useCallback, useState } from "react";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";

export function useXrpSmartAccountExecutor() {
  const { sendCallsAsync, isPending, error, reset } = useSendCalls();
  const [callsId, setCallsId] = useState<string | undefined>();

  const status = useWaitForCallsStatus({
    id: callsId ?? "",
    query: {
      enabled: Boolean(callsId),
    },
  });

  const submitCalls = useCallback(
    async (...args: Parameters<typeof sendCallsAsync>) => {
      reset();
      setCallsId(undefined);

      const result = await sendCallsAsync(...args);
      setCallsId(result.id);
      return result;
    },
    [reset, sendCallsAsync],
  );

  const clear = useCallback(() => {
    setCallsId(undefined);
    reset();
  }, [reset]);

  return {
    submitCalls,
    callsId,
    status,
    isSubmitting: isPending,
    error,
    clear,
  };
}
