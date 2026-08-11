// Generated from the compiled RailSplitPay artifact. Do not edit by hand.
// Regenerate with: node contracts/scripts/write-abi.js

export const RAILSPLIT_PAY_ABI = [
  {
    "inputs": [],
    "name": "ExpiryInPast",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "feedTimestamp",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "blockTimestamp",
        "type": "uint256"
      }
    ],
    "name": "FeedStale",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeedUnavailable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LinkExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LinkInactive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotMerchant",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlugRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlugTaken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlugTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TitleRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TitleTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "provided",
        "type": "uint256"
      }
    ],
    "name": "Underpaid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnknownLink",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "linkId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "merchant",
        "type": "address"
      }
    ],
    "name": "PaymentLinkClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "linkId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "merchant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "slug",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "priceUsdCents",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "PaymentLinkCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "linkId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "merchant",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountWei",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "priceUsdCents",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "flrUsdPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "int8",
        "name": "flrUsdDecimals",
        "type": "int8"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "feedTimestamp",
        "type": "uint64"
      }
    ],
    "name": "PaymentReceived",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "FLR_USD_FEED_ID",
    "outputs": [
      {
        "internalType": "bytes21",
        "name": "",
        "type": "bytes21"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_QUOTE_AGE",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "slug",
        "type": "string"
      }
    ],
    "name": "closePaymentLink",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "slug",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "uint64",
        "name": "priceUsdCents",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "createPaymentLink",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "linkId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "flrUsdFeed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "int8",
        "name": "decimals",
        "type": "int8"
      },
      {
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getLinks",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "merchant",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "priceUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint32",
            "name": "paymentCount",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "totalReceivedWei",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "totalReceivedUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "slug",
            "type": "string"
          }
        ],
        "internalType": "struct RailSplitPay.PaymentLink[]",
        "name": "page",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "slug",
        "type": "string"
      }
    ],
    "name": "getPaymentLink",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "merchant",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "priceUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint32",
            "name": "paymentCount",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "totalReceivedWei",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "totalReceivedUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "slug",
            "type": "string"
          }
        ],
        "internalType": "struct RailSplitPay.PaymentLink",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "linkId",
        "type": "bytes32"
      }
    ],
    "name": "getPaymentLinkById",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "merchant",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "priceUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint32",
            "name": "paymentCount",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "totalReceivedWei",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "totalReceivedUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "slug",
            "type": "string"
          }
        ],
        "internalType": "struct RailSplitPay.PaymentLink",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getPayments",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "linkId",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "payer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountWei",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "priceUsdCents",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "paidAt",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "flrUsdPrice",
            "type": "uint256"
          },
          {
            "internalType": "int8",
            "name": "flrUsdDecimals",
            "type": "int8"
          }
        ],
        "internalType": "struct RailSplitPay.Payment[]",
        "name": "page",
        "type": "tuple[]"
      },
      {
        "internalType": "string[]",
        "name": "slugs",
        "type": "string[]"
      },
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "linkCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "linkIdAt",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "merchant",
        "type": "address"
      }
    ],
    "name": "merchantLinkCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "merchant",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "merchantLinkIdAt",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "slug",
        "type": "string"
      }
    ],
    "name": "pay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paymentCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "slug",
        "type": "string"
      }
    ],
    "name": "quote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "requiredWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "flrUsdPrice",
        "type": "uint256"
      },
      {
        "internalType": "int8",
        "name": "flrUsdDecimals",
        "type": "int8"
      },
      {
        "internalType": "uint64",
        "name": "feedTimestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "priceUsdCents",
        "type": "uint64"
      }
    ],
    "name": "quoteUsdCents",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "requiredWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "flrUsdPrice",
        "type": "uint256"
      },
      {
        "internalType": "int8",
        "name": "flrUsdDecimals",
        "type": "int8"
      },
      {
        "internalType": "uint64",
        "name": "feedTimestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
