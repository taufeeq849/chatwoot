<script setup>
import { computed, onUnmounted } from 'vue';
import { useToggle } from '@vueuse/core';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useMessageSelection } from 'dashboard/composables/useMessageSelection';
import { useMessageFormatter } from 'shared/composables/useMessageFormatter';
import { useI18n } from 'vue-i18n';
import { emitter } from 'shared/helpers/mitt';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { messageStamp } from 'shared/helpers/timeHelper';
import EmailTranscriptModal from './EmailTranscriptModal.vue';
import ResolveAction from '../../buttons/ResolveAction.vue';
import ButtonV4 from 'dashboard/components-next/button/Button.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

import {
  CMD_MUTE_CONVERSATION,
  CMD_SEND_TRANSCRIPT,
  CMD_UNMUTE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';

// No props needed as we're getting currentChat from the store directly
const store = useStore();
const { t } = useI18n();

const [showEmailActionsModal, toggleEmailModal] = useToggle(false);
const [showActionsDropdown, toggleDropdown] = useToggle(false);
const { getPlainText } = useMessageFormatter();

const { isSelectMode, selectedCount, exitSelectMode, getSelectedMessages } =
  useMessageSelection();

async function copySelectedMessages() {
  const messages = getSelectedMessages();
  const formatted = messages
    .map(msg => {
      const sender = msg.sender?.name || t('SYSTEM');
      const timestamp = messageStamp(msg.created_at, 'h:mm a, MMM d');
      const content = getPlainText(msg.content || '');
      return `[${sender}] [${timestamp}]:\n${content}`;
    })
    .join('\n\n');

  await copyTextToClipboard(formatted);
  useAlert(t('CONVERSATION.CONTEXT_MENU.MESSAGES_COPIED'));
  exitSelectMode();
}

const currentChat = computed(() => store.getters.getSelectedChat);

const actionMenuItems = computed(() => {
  const items = [];

  if (!currentChat.value.muted) {
    items.push({
      icon: 'i-lucide-volume-off',
      label: t('CONTACT_PANEL.MUTE_CONTACT'),
      action: 'mute',
      value: 'mute',
    });
  } else {
    items.push({
      icon: 'i-lucide-volume-1',
      label: t('CONTACT_PANEL.UNMUTE_CONTACT'),
      action: 'unmute',
      value: 'unmute',
    });
  }

  items.push({
    icon: 'i-lucide-share',
    label: t('CONTACT_PANEL.SEND_TRANSCRIPT'),
    action: 'send_transcript',
    value: 'send_transcript',
  });

  return items;
});

const handleActionClick = ({ action }) => {
  toggleDropdown(false);

  if (action === 'mute') {
    store.dispatch('muteConversation', currentChat.value.id);
    useAlert(t('CONTACT_PANEL.MUTED_SUCCESS'));
  } else if (action === 'unmute') {
    store.dispatch('unmuteConversation', currentChat.value.id);
    useAlert(t('CONTACT_PANEL.UNMUTED_SUCCESS'));
  } else if (action === 'send_transcript') {
    toggleEmailModal();
  }
};

// These functions are needed for the event listeners
const mute = () => {
  store.dispatch('muteConversation', currentChat.value.id);
  useAlert(t('CONTACT_PANEL.MUTED_SUCCESS'));
};

const unmute = () => {
  store.dispatch('unmuteConversation', currentChat.value.id);
  useAlert(t('CONTACT_PANEL.UNMUTED_SUCCESS'));
};

emitter.on(CMD_MUTE_CONVERSATION, mute);
emitter.on(CMD_UNMUTE_CONVERSATION, unmute);
emitter.on(CMD_SEND_TRANSCRIPT, toggleEmailModal);

onUnmounted(() => {
  emitter.off(CMD_MUTE_CONVERSATION, mute);
  emitter.off(CMD_UNMUTE_CONVERSATION, unmute);
  emitter.off(CMD_SEND_TRANSCRIPT, toggleEmailModal);
});
</script>

<template>
  <div class="relative flex items-center gap-2 actions--container">
    <div v-if="isSelectMode" class="flex items-center gap-2">
      <ButtonV4
        size="sm"
        variant="ghost"
        color="slate"
        :label="$t('CONVERSATION.CONTEXT_MENU.CANCEL_SELECTION')"
        @click="exitSelectMode"
      />
      <ButtonV4
        size="sm"
        color="blue"
        :label="`${$t('CONVERSATION.CONTEXT_MENU.COPY_SELECTED')} (${selectedCount})`"
        icon="i-lucide-copy"
        :disabled="selectedCount === 0"
        @click="copySelectedMessages"
      />
    </div>
    <div v-else class="flex items-center gap-2">
      <ResolveAction
        :conversation-id="currentChat.id"
        :status="currentChat.status"
      />
      <div
        v-on-clickaway="() => toggleDropdown(false)"
        class="relative flex items-center group"
      >
        <ButtonV4
          v-tooltip="$t('CONVERSATION.HEADER.MORE_ACTIONS')"
          size="sm"
          variant="ghost"
          color="slate"
          icon="i-lucide-more-vertical"
          class="rounded-md group-hover:bg-n-alpha-2"
          @click="toggleDropdown()"
        />
        <DropdownMenu
          v-if="showActionsDropdown"
          :menu-items="actionMenuItems"
          class="mt-1 ltr:right-0 rtl:left-0 top-full"
          @action="handleActionClick"
        />
      </div>
    </div>
    <EmailTranscriptModal
      v-if="showEmailActionsModal"
      :show="showEmailActionsModal"
      :current-chat="currentChat"
      @cancel="toggleEmailModal"
    />
  </div>
</template>
