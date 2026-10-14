import { createServices } from '@/services/create-services';
import { Repository } from '@/services/repository';
import { SESSION_KEY } from '@/services/session-service';
import { buildSeedDatabase } from '@/services/seed';
import { createMemoryStorage } from '@/services/storage';

import { NOW, OP, createFlakyStorage, errorCode, unwrap } from './harness';

/** Cada "abertura do app" é um conjunto novo de serviços sobre o mesmo armazenamento. */
function openApp(dataStorage = createMemoryStorage(), sessionStorage = createMemoryStorage()) {
  const clock = { now: () => new Date(NOW) };
  const repo = new Repository(dataStorage, buildSeedDatabase, clock);
  return { services: createServices(repo, sessionStorage), dataStorage, sessionStorage };
}

describe('sessão do operador', () => {
  it('login válido guarda a sessão e a reabertura do app a recupera', async () => {
    const dataStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();

    const first = openApp(dataStorage, sessionStorage);
    const operator = unwrap(await first.services.session.signIn('619853'));
    expect(operator.id).toBe(OP.rafael);

    const second = openApp(dataStorage, sessionStorage);
    const restored = await second.services.session.restore();
    expect(restored?.name).toBe('Rafael Souza');
  });

  it('guarda somente o ID do operador, nunca a matrícula digitada', async () => {
    const { services, sessionStorage } = openApp();
    await services.session.signIn('483917');
    const raw = await sessionStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw ?? 'null')).toEqual({ operatorId: OP.carlos });
  });

  it('logout apaga a sessão', async () => {
    const { services, sessionStorage } = openApp();
    await services.session.signIn('483917');
    await services.session.signOut();
    expect(await sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await services.session.restore()).toBeNull();
  });

  it('matrículas inválidas não criam sessão', async () => {
    const { services, sessionStorage } = openApp();
    expect(errorCode(await services.session.signIn(''))).toBe('MATRICULA_INVALIDA');
    expect(errorCode(await services.session.signIn('12ab34'))).toBe('MATRICULA_INVALIDA');
    expect(errorCode(await services.session.signIn('999999'))).toBe('MATRICULA_INEXISTENTE');
    expect(errorCode(await services.session.signIn('358071'))).toBe('OPERADOR_INATIVO');
    expect(await sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('descarta a sessão salva se o operador não existir mais', async () => {
    const sessionStorage = createMemoryStorage({
      [SESSION_KEY]: JSON.stringify({ operatorId: 'op-999' }),
    });
    const { services } = openApp(createMemoryStorage(), sessionStorage);
    expect(await services.session.restore()).toBeNull();
    expect(await sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('descarta a sessão salva se o operador foi inativado', async () => {
    const sessionStorage = createMemoryStorage({
      [SESSION_KEY]: JSON.stringify({ operatorId: OP.ricardo }),
    });
    const { services } = openApp(createMemoryStorage(), sessionStorage);
    expect(await services.session.restore()).toBeNull();
    expect(await sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('trata sessão corrompida como sem sessão', async () => {
    const sessionStorage = createMemoryStorage({ [SESSION_KEY]: '{nao e json' });
    const { services } = openApp(createMemoryStorage(), sessionStorage);
    expect(await services.session.restore()).toBeNull();
  });

  it('o login funciona mesmo se a sessão não puder ser gravada', async () => {
    const flaky = createFlakyStorage(createMemoryStorage());
    flaky.state.failWrites = true;
    const { services } = openApp(createMemoryStorage(), flaky.storage);
    expect(unwrap(await services.session.signIn('574206')).name).toBe('Fernanda Lima');
  });

  it('com persistência desligada, restore nunca devolve operador', async () => {
    const sessionStorage = createMemoryStorage({
      [SESSION_KEY]: JSON.stringify({ operatorId: OP.carlos }),
    });
    const clock = { now: () => new Date(NOW) };
    const repo = new Repository(createMemoryStorage(), buildSeedDatabase, clock);
    const { createSessionService } = await import('@/services/session-service');
    const { createOperatorService } = await import('@/services/operator-service');
    const session = createSessionService(sessionStorage, createOperatorService(repo), {
      persist: false,
    });
    expect(await session.restore()).toBeNull();
    unwrap(await session.signIn('483917'));
    expect(await sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
