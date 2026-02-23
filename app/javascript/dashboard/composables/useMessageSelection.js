import { ref, computed } from 'vue';

// Module-level state — shared singleton across all components
const isSelectMode = ref(false);
const selectedMessageIds = ref(new Set());

// Registered messages getter — set by MessagesView, called by copySelectedMessages
let messagesGetter = () => [];

export function useMessageSelection() {
  const selectedCount = computed(() => selectedMessageIds.value.size);

  function toggleSelectMode() {
    isSelectMode.value = !isSelectMode.value;
    if (!isSelectMode.value) {
      selectedMessageIds.value = new Set();
    }
  }

  function exitSelectMode() {
    isSelectMode.value = false;
    selectedMessageIds.value = new Set();
  }

  function toggleMessageSelection(id) {
    const next = new Set(selectedMessageIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedMessageIds.value = next;
  }

  function registerMessagesGetter(getter) {
    messagesGetter = getter;
  }

  function resetSelectionState() {
    isSelectMode.value = false;
    selectedMessageIds.value = new Set();
    messagesGetter = () => [];
  }

  function getSelectedMessages() {
    return messagesGetter()
      .filter(msg => selectedMessageIds.value.has(msg.id))
      .sort((a, b) => a.created_at - b.created_at);
  }

  return {
    isSelectMode,
    selectedMessageIds,
    selectedCount,
    toggleSelectMode,
    exitSelectMode,
    toggleMessageSelection,
    registerMessagesGetter,
    resetSelectionState,
    getSelectedMessages,
  };
}
