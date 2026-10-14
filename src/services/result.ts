export type ServiceErrorCode =
  | 'MATRICULA_INVALIDA'
  | 'MATRICULA_INEXISTENTE'
  | 'OPERADOR_NAO_ENCONTRADO'
  | 'OPERADOR_INATIVO'
  | 'IDENTIFICADOR_INVALIDO'
  | 'PECA_NAO_ENCONTRADA'
  | 'ACESSO_NEGADO'
  | 'ETAPA_INCOMPATIVEL'
  | 'JA_VALIDADA'
  | 'PECA_EM_REVISAO'
  | 'PECA_REPROVADA'
  | 'PECA_CONCLUIDA'
  | 'PECA_NAO_CONCLUIDA'
  | 'JUSTIFICATIVA_OBRIGATORIA'
  | 'MOTIVO_INVALIDO'
  | 'REVISAO_NAO_ENCONTRADA'
  | 'REVISAO_JA_DECIDIDA'
  | 'NOTIFICACAO_NAO_ENCONTRADA'
  | 'DOSSIE_NAO_ENCONTRADO'
  | 'ERRO_ARMAZENAMENTO';

export interface ServiceError {
  code: ServiceErrorCode;
  /** Mensagem em português, pronta para exibir ao operador. */
  message: string;
}

/** Resultado de um serviço: regras violadas voltam como erro tipado, sem exceções. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: ServiceErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
