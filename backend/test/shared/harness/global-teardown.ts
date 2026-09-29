import { getContainer } from './container-registry';

export default async function globalTeardown(): Promise<void> {
  const container = getContainer();
  if (container) {
    await container.stop();
  }
}
