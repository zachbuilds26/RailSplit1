import type { Metadata } from "next";
import { LaunchFilm } from "./launch-film";

export const metadata: Metadata = {
  title: "Launch film",
  description:
    "SETTLED. — the RailSplit launch film. One link. Clear payments. A price, a link, a wallet.",
};

export default function LaunchPage() {
  return <LaunchFilm />;
}
