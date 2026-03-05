# Testing

## Current Status

There is no `npm test` script in `package.json`. Automated tests appear as standalone Node scripts under `tests/`.

## Available Test Scripts

- `node tests/simple_test.js` - quick streaming validation
- `node tests/test_streaming.js` - full streaming event capture
- `node tests/test_client.js`
- `node tests/test_image_generation.js`
- `node tests/test_main_app_request.js`
- `node tests/streaming.spec.js` (manual run if needed)

## Lint

```bash
npm run lint
```

## References

- [tests/README.md](../tests/README.md)
- [package.json](../package.json)
