import { useMemo } from "react";
import HoloCard from "./HoloCard.jsx";
import PokemonFace from "./PokemonFace.jsx";
import { getCardTexture } from "../utils/cardTexture.js";

/**
 * Голографическая карточка покемона: WebGL-фольга (HoloCard) + DOM-слой с данными.
 * WebGL запускается только у двух верхних карточек колоды — остальные показывают ту же текстуру статично.
 */
// Сенсорные экраны ярче и ближе к глазам: фольга там слабее, чем при просмотре с мышью
const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export default function PokemonHoloCard({ pokemon, interactive, live, isFavorite, onFavorite, evolutions, onEvolve }) {
  const texture = useMemo(() => getCardTexture(), []);

  return (
    <HoloCard
      key={live ? "live" : "still"}
      image={texture}
      webgl={live}
      className="holo-card--layered"
      preset="bursts"
      overlay
      intensity={COARSE ? 0.14 : 0.26}
      edgeSparkle={COARSE ? 0.08 : 0.15}
      hoverScale={1.02}
      glare={COARSE ? 0.16 : 0.3}
      tiltMax={8}
      frame={4.5}
      radius={24}
      idle={interactive && !COARSE}
      shadow
      style={{ "--hc-w": "100%" }}
    >
      <PokemonFace
        pokemon={pokemon}
        interactive={interactive}
        isFavorite={isFavorite}
        onFavorite={onFavorite}
        evolutions={evolutions}
        onEvolve={onEvolve}
      />
    </HoloCard>
  );
}
