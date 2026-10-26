export abstract class DomainError extends Error {
  abstract readonly codigo: string;
  abstract readonly statusHttp: number;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class ErroValidacao extends DomainError {
  readonly codigo = "DADOS_INVALIDOS";
  readonly statusHttp = 400;
}
export class ErroAutenticacao extends DomainError {
  readonly codigo = "NAO_AUTENTICADO";
  readonly statusHttp = 401;
}
export class ErroPermissao extends DomainError {
  readonly codigo = "SEM_PERMISSAO";
  readonly statusHttp = 403;
}
export class ErroNaoEncontrado extends DomainError {
  readonly codigo = "NAO_ENCONTRADO";
  readonly statusHttp = 404;
}
export class ErroConflito extends DomainError {
  readonly codigo = "CONFLITO";
  readonly statusHttp = 409;
}
export class ErroRegraNegocio extends DomainError {
  readonly codigo = "REGRA_NEGOCIO";
  readonly statusHttp = 422;
}
export class ErroConfiguracao extends DomainError {
  readonly codigo = "CONFIGURACAO_INVALIDA";
  readonly statusHttp = 500;
}
