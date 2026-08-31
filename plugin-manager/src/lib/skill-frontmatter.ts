// Leitura de um arquivo SKILL.md no formato que o `dsh` já usa em disco.
//
// Uma função só, usada pela importação do painel e pelo seed, porque as duas
// precisam concordar byte a byte sobre o que é frontmatter e o que é corpo.
// Discordar aqui produziria skills que o painel mostra de um jeito e o modelo
// recebe de outro.

import { parse as parseYaml } from "yaml";
import { SKILL_NAME_PATTERN } from "@/lib/skills";

/** Uma skill lida de um SKILL.md, já projetada nas colunas de `LibrarySkill`. */
export type ParsedSkillFile = {
  name: string;
  description: string;
  whenToUse: string | null;
  content: string;
  modelInvocable: boolean;
  userInvocable: boolean;
};

/** Frontmatter ausente, YAML inválido ou campo obrigatório faltando. */
export class SkillFrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillFrontmatterError";
  }
}

/**
 * Separa o bloco `---` inicial do corpo.
 *
 * O delimitador de fechamento é procurado linha a linha e não por regex sobre o
 * texto inteiro: um corpo de skill contém `---` com frequência (regra
 * horizontal em Markdown), e casar o primeiro que aparecer engoliria metade das
 * instruções como se fosse YAML.
 */
function splitFrontmatter(source: string): { yaml: string; body: string } {
  // O BOM de um arquivo salvo no Windows fica antes do `---` e faria a primeira
  // linha não casar.
  const text = source.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  if (lines[0]?.trim() !== "---") {
    throw new SkillFrontmatterError(
      "O arquivo precisa começar com um bloco de frontmatter delimitado por ---.",
    );
  }

  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closing === -1) {
    throw new SkillFrontmatterError(
      "O bloco de frontmatter foi aberto mas nunca fechado com ---.",
    );
  }

  return {
    yaml: lines.slice(1, closing).join("\n"),
    body: lines.slice(closing + 1).join("\n"),
  };
}

/** Lê uma chave de texto opcional, recusando um tipo que não seja string. */
function optionalText(
  fields: Record<string, unknown>,
  key: string,
): string | null {
  const value = fields[key];

  if (value === undefined || value === null) return null;

  if (typeof value !== "string") {
    throw new SkillFrontmatterError(`O campo "${key}" precisa ser texto.`);
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Lê um interruptor do frontmatter. Ausente vale `fallback` — é o mesmo default
 * que o provider de filesystem do `dsh` aplica, e é o que faz um SKILL.md sem
 * esses campos continuar valendo para os dois lados.
 */
function optionalFlag(
  fields: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = fields[key];

  if (value === undefined || value === null) return fallback;

  if (typeof value !== "boolean") {
    throw new SkillFrontmatterError(
      `O campo "${key}" precisa ser true ou false.`,
    );
  }

  return value;
}

/**
 * Lê um SKILL.md completo.
 *
 * As chaves aceitas são exatamente as que o provider de filesystem do `dsh` lê,
 * incluindo a grafia kebab-case de `disable-model-invocation` e
 * `user-invocable` — as variantes camelCase são recusadas lá, e aceitá-las aqui
 * criaria skills que funcionam no painel e não no cliente.
 * @param source - conteúdo bruto do arquivo, com frontmatter.
 * @returns a skill projetada nas colunas de `LibrarySkill`.
 * @throws SkillFrontmatterError quando o frontmatter falta, não é um mapa, ou
 *   um campo obrigatório está ausente ou com o tipo errado.
 */
export function parseSkillFile(source: string): ParsedSkillFile {
  const { yaml, body } = splitFrontmatter(source);

  let parsed: unknown;

  try {
    parsed = parseYaml(yaml);
  } catch (error) {
    throw new SkillFrontmatterError(
      `O frontmatter não é YAML válido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SkillFrontmatterError(
      "O frontmatter precisa ser um mapa de campos.",
    );
  }

  const fields = parsed as Record<string, unknown>;
  const name = optionalText(fields, "name");
  const description = optionalText(fields, "description");

  if (name === null) {
    throw new SkillFrontmatterError('O frontmatter precisa ter "name".');
  }

  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new SkillFrontmatterError(
      `"${name}" não é um nome válido de skill: use minúsculas, números e hífen.`,
    );
  }

  if (description === null) {
    throw new SkillFrontmatterError('O frontmatter precisa ter "description".');
  }

  const content = body.trim();

  if (content === "") {
    throw new SkillFrontmatterError(
      "O arquivo não tem corpo depois do frontmatter.",
    );
  }

  return {
    name,
    description,
    whenToUse: optionalText(fields, "whenToUse"),
    content,
    // `disable-model-invocation` é o inverso do campo que guardamos, e o default
    // de ausência é "pode ser invocada" nos dois casos.
    modelInvocable: !optionalFlag(fields, "disable-model-invocation", false),
    userInvocable: optionalFlag(fields, "user-invocable", true),
  };
}
