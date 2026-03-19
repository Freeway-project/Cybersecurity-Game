import { blockCipherLevel } from "@/modules/game/content";

export function decryptCaesar(ciphertext: string, shift: number) {
  return ciphertext.replace(/[A-Z]/g, (character) =>
    String.fromCharCode(
      ((character.charCodeAt(0) - 65 - shift + 26 * 10) % 26) + 65,
    ),
  );
}

export function normalizeHex(input: string) {
  return input.replace(/\s+/g, "").toLowerCase();
}

export function isHexString(input: string) {
  return input.length > 0 && input.length % 2 === 0 && /^[0-9a-f]+$/i.test(input);
}

export function xorHexStrings(leftHex: string, rightHex: string) {
  const left = normalizeHex(leftHex);
  const right = normalizeHex(rightHex);

  if (!isHexString(left) || !isHexString(right)) {
    return null;
  }

  if (left.length !== right.length) {
    return null;
  }

  let output = "";

  for (let index = 0; index < left.length; index += 2) {
    const byte =
      Number.parseInt(left.slice(index, index + 2), 16) ^
      Number.parseInt(right.slice(index, index + 2), 16);

    output += byte.toString(16).padStart(2, "0");
  }

  return output;
}

export function hexToAscii(hex: string) {
  const normalized = normalizeHex(hex);

  if (!isHexString(normalized)) {
    return "";
  }

  let output = "";

  for (let index = 0; index < normalized.length; index += 2) {
    output += String.fromCharCode(Number.parseInt(normalized.slice(index, index + 2), 16));
  }

  return output;
}

export function evaluateBlockSequence(selection: string[]) {
  const choiceLabelById = Object.fromEntries(
    blockCipherLevel.choices.map((choice) => [choice.id, choice.label]),
  ) as Record<string, string>;

  const feedback = selection.flatMap((choiceId, index) => {
    const expectedId = blockCipherLevel.correctSequence[index];
    const selectedLabel = choiceLabelById[choiceId];
    const expectedLabel = choiceLabelById[expectedId];

    if (!choiceId) {
      return [`${blockCipherLevel.slotLabels[index]} is still empty.`];
    }

    if (choiceId === expectedId) {
      return [];
    }

    if (choiceId === "reuse-iv-as-key") {
      return [
        `${blockCipherLevel.slotLabels[index]} is incorrect. The IV never becomes the secret key.`,
      ];
    }

    return [
      `${blockCipherLevel.slotLabels[index]} should be "${expectedLabel}", not "${selectedLabel}".`,
    ];
  });

  return {
    correct: feedback.length === 0,
    feedback,
  };
}
