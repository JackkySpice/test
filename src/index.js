const { createServer } = require('./server');

async function bootstrap() {
  const server = createServer();
  const port = process.env.PORT || 3000;
  await server.start(port);
  console.log(`Codex Cloud wrapper listening on port ${port}`); // eslint-disable-line no-console

  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Shutting down on ${signal}`); // eslint-disable-line no-console
      await server.stop();
      process.exit(0);
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error); // eslint-disable-line no-console
  process.exit(1);
});
