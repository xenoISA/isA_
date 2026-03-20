/**
 * HIL (Human-in-the-Loop) Handler Functions
 *
 * Extracted from ChatModule.tsx for separation of concerns.
 * All handler logic is identical to the original — this is a move, not a refactor.
 */
import { useChatStore } from '../../stores/useChatStore';
import { logger, LogCategory, createLogger } from '../../utils/logger';
import { executionControlService } from '../../api/ExecutionControlService';
import {
  HILInterruptData,
  HILCheckpointData,
  HILExecutionStatusData,
  AGUIConverter
} from '../../types/aguiTypes';

const log = createLogger('ChatModule:HIL');

export interface HILHandlerDeps {
  currentSessionId: string | undefined;
  setHilInterrupts: React.Dispatch<React.SetStateAction<HILInterruptData[]>>;
  setCurrentInterrupt: React.Dispatch<React.SetStateAction<HILInterruptData | null>>;
  setShowInterruptModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHilStatusPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setHilCheckpoints: React.Dispatch<React.SetStateAction<HILCheckpointData[]>>;
  setHilStatus: React.Dispatch<React.SetStateAction<HILExecutionStatusData | null>>;
  setIsProcessingHilAction: React.Dispatch<React.SetStateAction<boolean>>;
}

export function createHILHandlers(deps: HILHandlerDeps) {
  const {
    currentSessionId,
    setHilInterrupts,
    setCurrentInterrupt,
    setShowInterruptModal,
    setShowHilStatusPanel,
    setHilCheckpoints,
    setHilStatus,
    setIsProcessingHilAction,
  } = deps;

  const handleHILInterrupt = (interrupt: HILInterruptData) => {
    log.info('HIL interrupt detected:', interrupt);

    const interruptWithThreadId = {
      ...interrupt,
      thread_id: currentSessionId || interrupt.thread_id
    };

    setHilInterrupts(prev => [...prev, interruptWithThreadId]);
    setCurrentInterrupt(interruptWithThreadId);
    setShowInterruptModal(true);

    setShowHilStatusPanel(true);

    log.info('Stopping current chat stream due to HIL interrupt');
    useChatStore.getState().finishStreamingMessage();

    try {
      import('../../api/chatService').then(({ chatService }) => {
        (chatService as any).cancelAllRequests();
        log.info('Cancelled current chat service requests');
      }).catch(error => {
        log.warn('Failed to cancel chat service requests:', error);
      });
    } catch (error) {
      log.warn('Failed to import chat service:', error);
    }

    useChatStore.getState().updateStreamingStatus(`⏸️ Human intervention required: ${interrupt.title}`);

    logger.info(LogCategory.CHAT_FLOW, 'HIL interrupt detected and modal opened', {
      interruptId: interrupt.id,
      type: interrupt.type
    });
  };

  const handleHILCheckpoint = (checkpoint: HILCheckpointData) => {
    log.info('HIL checkpoint created:', checkpoint);

    setHilCheckpoints(prev => [checkpoint, ...prev.slice(0, 19)]);

    useChatStore.getState().updateStreamingStatus(`📍 Checkpoint saved: ${checkpoint.node}`);

    logger.debug(LogCategory.CHAT_FLOW, 'HIL checkpoint created', {
      checkpointId: checkpoint.checkpoint_id,
      node: checkpoint.node
    });
  };

  const handleHILStatusChange = (status: HILExecutionStatusData) => {
    setHilStatus(status);

    if (status.status === 'interrupted') {
      setShowHilStatusPanel(true);
    }

    logger.debug(LogCategory.CHAT_FLOW, 'HIL execution status changed', {
      threadId: status.thread_id,
      status: status.status
    });
  };

  const handleHILApprovalRequired = (approval: any) => {
    log.info('HIL approval required:', approval);
  };

  const handleHILReviewRequired = (review: any) => {
    log.info('HIL review required:', review);
  };

  const handleHILInputRequired = (input: any) => {
    log.info('HIL input required:', input);
  };

  const handleExecutionStarted = (event: any) => {
    log.info('Execution started:', event);
    useChatStore.getState().updateStreamingStatus('🚀 Execution started...');
  };

  const handleExecutionFinished = (event: any) => {
    log.info('Execution finished:', event);
    useChatStore.getState().updateStreamingStatus('🎉 Execution completed');
  };

  const handleExecutionError = (event: any) => {
    log.info('Execution error:', event);
    useChatStore.getState().updateStreamingStatus(`❌ Execution error: ${event.error?.message || 'Unknown error'}`);
  };

  const handleHILApprove = async (interruptId: string, data?: any) => {
    if (!currentSessionId) return;

    setIsProcessingHilAction(true);

    try {
      const resumeRequest = {
        thread_id: currentSessionId,
        action: 'continue' as const,
        resume_data: {
          approved: true,
          user_input: data,
          human_decision: 'approve_with_input',
          timestamp: new Date().toISOString(),
          interrupt_id: interruptId
        }
      };

      log.info('Approving HIL action:', resumeRequest);

      log.info('Starting HIL resume stream integration...');

      const resumeMessageId = `resume-${Date.now()}`;
      useChatStore.getState().startStreamingMessage(resumeMessageId, '🔄 Resuming execution...');

      await executionControlService.resumeExecutionStream(resumeRequest, {
        onResumeStart: (data) => {
          log.info('Resume started:', data);
          useChatStore.getState().updateStreamingStatus('🔄 Processing your input...');
        },
        onMessageStream: (data) => {
          log.info('Message stream event:', data);

          if (data.content?.raw_message) {
            let messageContent = data.content.raw_message;

            const contentMatch = messageContent.match(/content='([^']*(?:\\\\'[^']*)*)'|content="([^"]*(?:\\\\"[^"]*)*)"/);;
            if (contentMatch) {
              messageContent = contentMatch[1] || contentMatch[2];
              messageContent = messageContent.replace(/\\\\"/g, '"').replace(/\\\\'/g, "'");
              log.info('Extracted content:', messageContent.substring(0, 100) + '...');

              if (messageContent && messageContent.trim() && !messageContent.includes('tool_calls')) {
                useChatStore.getState().appendToStreamingMessage(messageContent);
              }
            }
          }
        },
        onResumeEnd: (data) => {
          log.info('Resume completed:', data);
          useChatStore.getState().updateStreamingStatus('✅ Response completed');
          useChatStore.getState().finishStreamingMessage();
        },
        onError: (error) => {
          log.error('Resume failed:', error);
          useChatStore.getState().updateStreamingStatus(`❌ Failed to resume: ${error.message}`);
          useChatStore.getState().finishStreamingMessage();
        }
      });

      setShowInterruptModal(false);
      setCurrentInterrupt(null);

      logger.info(LogCategory.CHAT_FLOW, 'HIL action approved and executed', { interruptId });

    } catch (error) {
      log.error('Failed to approve HIL action:', error);
      useChatStore.getState().updateStreamingStatus(`❌ Failed to approve action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingHilAction(false);
    }
  };

  const handleHILReject = async (interruptId: string, reason?: string) => {
    if (!currentSessionId) return;

    setIsProcessingHilAction(true);

    try {
      const resumeRequest = {
        thread_id: currentSessionId,
        action: 'reject' as const,
        resume_data: {
          approved: false,
          rejection_reason: reason,
          timestamp: new Date().toISOString()
        }
      };

      log.info('Rejecting HIL action:', resumeRequest);

      const result = await executionControlService.resumeExecution(resumeRequest);

      if (result.success) {
        useChatStore.getState().updateStreamingStatus('❌ Action rejected by user');
        setShowInterruptModal(false);
        setCurrentInterrupt(null);

        logger.info(LogCategory.CHAT_FLOW, 'HIL action rejected', { interruptId, reason });
      } else {
        throw new Error(result.message || 'Rejection failed');
      }

    } catch (error) {
      log.error('Failed to reject HIL action:', error);
      useChatStore.getState().updateStreamingStatus(`❌ Failed to reject action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingHilAction(false);
    }
  };

  const handleHILEdit = async (interruptId: string, editedContent: any) => {
    await handleHILApprove(interruptId, { edited_content: editedContent });
  };

  const handleHILInput = async (interruptId: string, userInput: any) => {
    await handleHILApprove(interruptId, { user_input: userInput });
  };

  const handleHILRollback = async (checkpointId: string) => {
    if (!currentSessionId) return;

    try {
      log.info('Rolling back to checkpoint:', checkpointId);

      const result = await executionControlService.rollbackToCheckpoint(currentSessionId, checkpointId);

      if (result.success) {
        useChatStore.getState().updateStreamingStatus(`🔄 Rolled back to: ${result.restored_state.node}`);

        await executionControlService.getExecutionStatus(currentSessionId)
          .then(status => {
            setHilStatus(AGUIConverter.toHILExecutionStatusData(status, currentSessionId));
          })
          .catch(err => log.error('Failed to get execution status', err));

        logger.info(LogCategory.CHAT_FLOW, 'HIL rollback completed', {
          checkpointId,
          restoredNode: result.restored_state.node
        });
      } else {
        throw new Error(result.message || 'Rollback failed');
      }

    } catch (error) {
      log.error('Failed to rollback:', error);
      useChatStore.getState().updateStreamingStatus(`❌ Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleHILPauseExecution = async () => {
    if (!currentSessionId) return;

    try {
      log.info('Pausing execution for thread:', currentSessionId);
      useChatStore.getState().updateStreamingStatus('⏸️ Execution paused by user');

    } catch (error) {
      log.error('Failed to pause execution:', error);
    }
  };

  const handleHILResumeExecution = async () => {
    if (!currentSessionId) return;

    try {
      const resumeRequest = {
        thread_id: currentSessionId,
        action: 'continue' as const,
        resume_data: {
          user_request: 'manual_resume',
          timestamp: new Date().toISOString()
        }
      };

      log.info('Resuming execution:', resumeRequest);

      const result = await executionControlService.resumeExecution(resumeRequest);

      if (result.success) {
        useChatStore.getState().updateStreamingStatus('▶️ Execution resumed');
      } else {
        throw new Error(result.message || 'Resume failed');
      }

    } catch (error) {
      log.error('Failed to resume execution:', error);
      useChatStore.getState().updateStreamingStatus(`❌ Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewInterrupt = (interrupt: HILInterruptData) => {
    setCurrentInterrupt(interrupt);
    setShowInterruptModal(true);
  };

  return {
    handleHILInterrupt,
    handleHILCheckpoint,
    handleHILStatusChange,
    handleHILApprovalRequired,
    handleHILReviewRequired,
    handleHILInputRequired,
    handleExecutionStarted,
    handleExecutionFinished,
    handleExecutionError,
    handleHILApprove,
    handleHILReject,
    handleHILEdit,
    handleHILInput,
    handleHILRollback,
    handleHILPauseExecution,
    handleHILResumeExecution,
    handleViewInterrupt,
  };
}
