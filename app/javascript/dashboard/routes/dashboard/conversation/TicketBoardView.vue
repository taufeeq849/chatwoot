<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import ConversationApi from 'dashboard/api/inbox/conversation';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import ConversationBox from 'dashboard/components/widgets/conversation/ConversationBox.vue';
import ContextMenu from 'dashboard/components/ui/ContextMenu.vue';
import ConversationContextMenu from 'dashboard/components/widgets/conversation/contextMenu/Index.vue';
import CmdBarConversationSnooze from 'dashboard/routes/dashboard/commands/CmdBarConversationSnooze.vue';
import { useAccount } from 'dashboard/composables/useAccount';
import { useConversationActions } from 'dashboard/composables/useConversationActions';
import { frontendURL } from 'dashboard/helper/URLHelper';

const TWENTY_FOUR_HOURS = 86400;

const { t } = useI18n();
const store = useStore();
const { accountId } = useAccount();
const conversationActions = useConversationActions();

const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: null, y: null });
const contextMenuChat = ref(null);

const openContextMenu = (e, conversation) => {
  e.preventDefault();
  contextMenuPosition.value = {
    x: e.pageX || e.clientX,
    y: e.pageY || e.clientY,
  };
  contextMenuChat.value = conversation;
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
  contextMenuPosition.value = { x: null, y: null };
  contextMenuChat.value = null;
};

const getConversationUrl = conversation => {
  return frontendURL(
    `accounts/${accountId.value}/conversations/${conversation.id}`
  );
};

const unassignedConversations = ref([]);
const inProgressConversations = ref([]);
const resolvedConversations = ref([]);
const isLoading = ref(true);
const selectedConversation = ref(null);

const isPanelOpen = computed(() => !!selectedConversation.value);

const columns = computed(() => [
  {
    key: 'unassigned',
    label: t('TICKET_BOARD.UNASSIGNED'),
    conversations: unassignedConversations.value,
    color: 'bg-n-amber-3 text-n-amber-11',
    dotColor: 'bg-n-amber-10',
  },
  {
    key: 'in_progress',
    label: t('TICKET_BOARD.IN_PROGRESS'),
    conversations: inProgressConversations.value,
    color: 'bg-n-blue-3 text-n-blue-11',
    dotColor: 'bg-n-blue-10',
  },
  {
    key: 'resolved',
    label: t('TICKET_BOARD.RESOLVED'),
    conversations: resolvedConversations.value,
    color: 'bg-n-teal-3 text-n-teal-11',
    dotColor: 'bg-n-teal-10',
  },
]);

const contactName = conversation => {
  const contact = conversation.meta?.sender;
  return contact?.name || t('TICKET_BOARD.UNKNOWN_CONTACT');
};

const contactThumbnail = conversation =>
  conversation.meta?.sender?.thumbnail || '';

const lastMessage = conversation => {
  const content = conversation.messages?.[0]?.content || '';
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
};

const selectConversation = async conversation => {
  selectedConversation.value = conversation;
  await store.dispatch('getConversation', conversation.id);
  const storeChat = store.getters.getAllConversations.find(
    c => c.id === conversation.id
  );
  if (storeChat) {
    store.dispatch('setActiveChat', { data: storeChat });
  }
};

const closePanel = () => {
  selectedConversation.value = null;
  store.dispatch('clearSelectedState');
};

const fetchConversations = async () => {
  isLoading.value = true;
  try {
    const [unassignedRes, openRes, resolvedRes] = await Promise.all([
      ConversationApi.get({
        status: 'open',
        assigneeType: 'unassigned',
        updatedWithin: TWENTY_FOUR_HOURS,
      }),
      ConversationApi.get({
        status: 'open',
        assigneeType: 'assigned',
        updatedWithin: TWENTY_FOUR_HOURS,
      }),
      ConversationApi.get({
        status: 'resolved',
        assigneeType: 'all',
        updatedWithin: TWENTY_FOUR_HOURS,
      }),
    ]);

    unassignedConversations.value =
      unassignedRes.data?.data?.payload || unassignedRes.data?.payload || [];
    inProgressConversations.value =
      openRes.data?.data?.payload || openRes.data?.payload || [];
    resolvedConversations.value =
      resolvedRes.data?.data?.payload || resolvedRes.data?.payload || [];
  } catch {
    unassignedConversations.value = [];
    inProgressConversations.value = [];
    resolvedConversations.value = [];
  } finally {
    isLoading.value = false;
  }
};

const withMenuAction = async actionFn => {
  const chatId = contextMenuChat.value.id;
  closeContextMenu();
  await actionFn(chatId);
  fetchConversations();
};

const onUpdateConversation = (status, snoozedUntil) =>
  withMenuAction(id =>
    conversationActions.toggleConversationStatus(id, status, snoozedUntil)
  );
const onAssignAgent = agent =>
  withMenuAction(id => conversationActions.assignAgent(agent, id));
const onAssignTeam = team =>
  withMenuAction(id => conversationActions.assignTeam(team, id));
const onAssignLabel = labels =>
  withMenuAction(id => conversationActions.assignLabels(labels, id));
const onAssignPriority = priority =>
  withMenuAction(id => conversationActions.assignPriority(priority, id));
const onDeleteConversation = () =>
  withMenuAction(id => conversationActions.deleteConversation(id));

const onMarkAsUnread = () => {
  conversationActions.markAsUnread(contextMenuChat.value.id);
  closeContextMenu();
};

const onMarkAsRead = () => {
  conversationActions.markAsRead(contextMenuChat.value.id);
  closeContextMenu();
};

onMounted(fetchConversations);

onUnmounted(() => {
  if (selectedConversation.value) {
    store.dispatch('clearSelectedState');
  }
});
</script>

<template>
  <div class="flex flex-col w-full h-full bg-n-background">
    <header
      class="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-n-weak"
    >
      <h1 class="text-lg font-medium text-n-slate-12">
        {{ t('TICKET_BOARD.TITLE') }}
      </h1>
    </header>

    <div v-if="isLoading" class="flex items-center justify-center flex-1">
      <span class="i-lucide-loader-circle size-6 text-n-blue-10 animate-spin" />
    </div>

    <div v-else class="flex flex-1 overflow-hidden">
      <!-- Board columns -->
      <div
        class="flex gap-4 p-4 overflow-x-auto transition-all duration-300 ease-in-out"
        :class="isPanelOpen ? 'w-2/5' : 'w-full'"
      >
        <div
          v-for="column in columns"
          :key="column.key"
          class="flex flex-col flex-1"
          :class="
            isPanelOpen
              ? 'min-w-[160px] max-w-[240px]'
              : 'min-w-[280px] max-w-[420px]'
          "
        >
          <div class="flex items-center gap-2 px-3 py-2 mb-3">
            <span class="rounded-full size-2" :class="column.dotColor" />
            <span class="text-sm font-medium text-n-slate-12">
              {{ column.label }}
            </span>
            <span
              class="px-1.5 py-0.5 text-xs font-medium rounded-full"
              :class="column.color"
            >
              {{ column.conversations.length }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            <div
              v-for="conversation in column.conversations"
              :key="conversation.id"
              class="p-3 border rounded-xl bg-n-solid-2 cursor-pointer transition-colors"
              :class="
                selectedConversation?.id === conversation.id
                  ? 'border-n-blue-7 ring-1 ring-n-blue-7'
                  : 'border-n-weak hover:border-n-slate-7'
              "
              @click="selectConversation(conversation)"
              @contextmenu="openContextMenu($event, conversation)"
            >
              <div class="flex items-center gap-2 mb-2">
                <Avatar
                  :src="contactThumbnail(conversation)"
                  :name="contactName(conversation)"
                  :size="24"
                  rounded-full
                />
                <span class="text-sm font-medium truncate text-n-slate-12">
                  {{ contactName(conversation) }}
                </span>
                <span class="ml-auto text-xs text-n-slate-10 flex-shrink-0">
                  {{ `#${conversation.id}` }}
                </span>
              </div>
              <p
                v-if="lastMessage(conversation)"
                class="mb-2 text-xs leading-relaxed text-n-slate-11 line-clamp-2"
              >
                {{ lastMessage(conversation) }}
              </p>
              <div class="flex items-center justify-between">
                <span class="text-[11px] text-n-slate-10">
                  {{ dynamicTime(conversation.timestamp) }}
                </span>
                <span
                  v-if="conversation.meta?.assignee"
                  class="text-[11px] text-n-slate-10 truncate max-w-[120px]"
                >
                  {{ conversation.meta.assignee.name }}
                </span>
              </div>
            </div>

            <div
              v-if="column.conversations.length === 0"
              class="flex items-center justify-center py-8"
            >
              <span class="text-sm text-n-slate-10">
                {{ t('TICKET_BOARD.NO_CONVERSATIONS') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ContextMenu
        v-if="showContextMenu"
        :x="contextMenuPosition.x"
        :y="contextMenuPosition.y"
        @close="closeContextMenu"
      >
        <ConversationContextMenu
          :status="contextMenuChat.status"
          :inbox-id="contextMenuChat.inbox_id"
          :priority="contextMenuChat.priority"
          :chat-id="contextMenuChat.id"
          :has-unread-messages="!!contextMenuChat.unread_count"
          :conversation-url="getConversationUrl(contextMenuChat)"
          @update-conversation="onUpdateConversation"
          @assign-agent="onAssignAgent"
          @assign-label="onAssignLabel"
          @assign-team="onAssignTeam"
          @mark-as-unread="onMarkAsUnread"
          @mark-as-read="onMarkAsRead"
          @assign-priority="onAssignPriority"
          @delete-conversation="onDeleteConversation"
          @close="closeContextMenu"
        />
      </ContextMenu>
      <CmdBarConversationSnooze />

      <!-- Inline conversation panel -->
      <div
        v-if="isPanelOpen"
        class="flex flex-col w-3/5 min-h-0 border-l border-n-weak"
      >
        <div
          class="flex items-center justify-end flex-shrink-0 px-2 py-1 border-b border-n-weak"
        >
          <button
            class="flex items-center justify-center rounded-lg size-8 text-n-slate-11 hover:bg-n-alpha-2 transition-colors"
            :title="t('TICKET_BOARD.CLOSE_PANEL')"
            @click="closePanel"
          >
            <span class="i-lucide-x size-4" />
          </button>
        </div>
        <div class="flex-1 min-h-0">
          <ConversationBox :is-on-expanded-layout="false" class="h-full" />
        </div>
      </div>
    </div>
  </div>
</template>
