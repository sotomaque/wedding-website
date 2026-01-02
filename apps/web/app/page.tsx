import { HomePageClient } from "@/components/home-page-client";
import { getAllPhotos } from "@/lib/photos";
import { pickRandomItems, shuffleArray } from "./utils";

export default async function Page() {
  const photos = await getAllPhotos();

  // Shuffle photos on the server to avoid hydration mismatch
  const heroPhotos = shuffleArray([...photos]);
  const storyPhotos = pickRandomItems([...photos], 3);

  return <HomePageClient heroPhotos={heroPhotos} storyPhotos={storyPhotos} />;
}
