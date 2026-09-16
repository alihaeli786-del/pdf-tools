import type { MetadataRoute } from "next";
import { tools } from "@/data/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://toolijo.com";

  const toolUrls = tools
    .filter((tool) => !tool.comingSoon)
    .map((tool) => ({
      url: `${baseUrl}${tool.href}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...toolUrls,
  ];
}
