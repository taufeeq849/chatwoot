import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';

/**
 * Composable for single-conversation context menu actions.
 * Provides store dispatches with user-facing alerts.
 */
export function useConversationActions() {
  const store = useStore();
  const { t } = useI18n();

  const toggleConversationStatus = async (
    conversationId,
    status,
    snoozedUntil
  ) => {
    try {
      await store.dispatch('toggleStatus', {
        conversationId,
        status,
        snoozedUntil,
      });
      useAlert(t('CONVERSATION.CHANGE_STATUS'));
    } catch {
      useAlert(t('CONVERSATION.CHANGE_STATUS_FAILED'));
    }
  };

  const assignAgent = async (agent, conversationId) => {
    try {
      await store.dispatch('bulkActions/process', {
        type: 'Conversation',
        ids: [conversationId],
        fields: { assignee_id: agent.id },
      });
      useAlert(
        t('CONVERSATION.CARD_CONTEXT_MENU.API.AGENT_ASSIGNMENT.SUCCESFUL', {
          agentName: agent.name,
          conversationId,
        })
      );
    } catch {
      useAlert(t('BULK_ACTION.ASSIGN_FAILED'));
    }
  };

  const assignTeam = async (team, conversationId) => {
    try {
      await store.dispatch('assignTeam', {
        conversationId,
        teamId: team.id,
      });
      useAlert(
        t('CONVERSATION.CARD_CONTEXT_MENU.API.TEAM_ASSIGNMENT.SUCCESFUL', {
          team: team.name,
          conversationId,
        })
      );
    } catch {
      useAlert(t('CONVERSATION.CARD_CONTEXT_MENU.API.TEAM_ASSIGNMENT.FAILED'));
    }
  };

  const assignLabels = async (labels, conversationId) => {
    try {
      await store.dispatch('bulkActions/process', {
        type: 'Conversation',
        ids: [conversationId],
        labels: { add: labels },
      });
      useAlert(
        t('CONVERSATION.CARD_CONTEXT_MENU.API.LABEL_ASSIGNMENT.SUCCESFUL', {
          labelName: labels[0],
          conversationId,
        })
      );
    } catch {
      useAlert(t('BULK_ACTION.LABELS.ASSIGN_FAILED'));
    }
  };

  const assignPriority = async (priority, conversationId) => {
    try {
      await store.dispatch('assignPriority', { conversationId, priority });
      useAlert(
        t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.SUCCESSFUL', {
          priority,
          conversationId,
        })
      );
      return true;
    } catch {
      useAlert(t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.FAILED'));
      return false;
    }
  };

  const markAsUnread = async conversationId => {
    try {
      await store.dispatch('markMessagesUnread', { id: conversationId });
    } catch {
      // Ignore error
    }
  };

  const markAsRead = async conversationId => {
    try {
      await store.dispatch('markMessagesRead', { id: conversationId });
    } catch {
      // Ignore error
    }
  };

  const deleteConversation = async conversationId => {
    try {
      await store.dispatch('deleteConversation', conversationId);
      useAlert(t('CONVERSATION.SUCCESS_DELETE_CONVERSATION'));
      return true;
    } catch {
      useAlert(t('CONVERSATION.FAIL_DELETE_CONVERSATION'));
      return false;
    }
  };

  return {
    toggleConversationStatus,
    assignAgent,
    assignTeam,
    assignLabels,
    assignPriority,
    markAsUnread,
    markAsRead,
    deleteConversation,
  };
}
