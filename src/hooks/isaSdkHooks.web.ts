/**
 * Web compatibility shim for @isa/hooks.
 *
 * isA_ aliases @isa/hooks directly to SDK source so local changes are visible
 * without rebuilding the SDK packages. The SDK root entry exports native-only
 * hooks that pull react-native into the Next.js web bundle, so this shim keeps
 * resolution on the web-safe surface while restoring the cross-platform hooks
 * the app currently imports.
 */

export * from '../../../isA_App_SDK/packages/hooks/src/index.web';

// The SDK web entry currently omits these cross-platform exports even though
// isA_ consumes them on the web.
export * from '../../../isA_App_SDK/packages/hooks/src/useAgentEvents';
export * from '../../../isA_App_SDK/packages/hooks/src/useAgentState';
export * from '../../../isA_App_SDK/packages/hooks/src/useAgentMemory';
export * from '../../../isA_App_SDK/packages/hooks/src/useApprovalPolicy';
export * from '../../../isA_App_SDK/packages/hooks/src/useCancellation';
export * from '../../../isA_App_SDK/packages/hooks/src/useNotifications';
export * from '../../../isA_App_SDK/packages/hooks/src/tracker';
