// Phase_12_InterfaceTypes.ts
import { i32 } from "../../../src/wasmath.ts";

/**
 * Testing how a dynamic array (Complex Type) 
 * is "seen" by the outside world.
 */
export function getScores(): i32[] {
  return [95, 88, 72];
}

console.log("getScores:", getScores());