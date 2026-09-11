import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const STORAGE_KEY = "@agenda_events_v1";

// Formate une date en "jeudi 11 septembre 2026"
function formatDateLong(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Formate une heure en "14:30"
function formatTime(date) {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Clé de tri/groupe "2026-09-11"
function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Chargement initial depuis le stockage local
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw).map((e) => ({
            ...e,
            date: new Date(e.date),
          }));
          setEvents(parsed);
        }
      } catch (e) {
        console.warn("Erreur de chargement", e);
      }
    })();
  }, []);

  // Sauvegarde à chaque modification
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events)).catch((e) =>
      console.warn("Erreur de sauvegarde", e)
    );
  }, [events]);

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setSelectedDate(new Date());
  };

  const openNewEventModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const saveEvent = () => {
    if (!title.trim()) {
      Alert.alert("Titre manquant", "Merci de donner un titre à l'événement.");
      return;
    }
    const newEvent = {
      id: Date.now().toString(),
      title: title.trim(),
      notes: notes.trim(),
      date: selectedDate,
    };
    setEvents((prev) => [...prev, newEvent]);
    setModalVisible(false);
    resetForm();
  };

  const deleteEvent = (id) => {
    Alert.alert("Supprimer", "Supprimer cet événement ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => setEvents((prev) => prev.filter((e) => e.id !== id)),
      },
    ]);
  };

  // Regroupe et trie les événements par jour
  const sections = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.date - b.date);
    const groups = {};
    for (const e of sorted) {
      const key = dateKey(e.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).map(([key, items]) => ({
      key,
      label: formatDateLong(items[0].date),
      items,
    }));
  }, [events]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Agenda</Text>
        <TouchableOpacity style={styles.addButton} onPress={openNewEventModal}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucun événement pour le moment.</Text>
          <Text style={styles.emptySubtext}>
            Appuyez sur "+ Ajouter" pour créer votre premier événement.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.key}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              {section.items.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.eventCard}
                  onLongPress={() => deleteEvent(e.id)}
                >
                  <View style={styles.eventTimeBox}>
                    <Text style={styles.eventTime}>{formatTime(e.date)}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    {!!e.notes && (
                      <Text style={styles.eventNotes}>{e.notes}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvel événement</Text>

            <TextInput
              style={styles.input}
              placeholder="Titre"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="Notes (optionnel)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                📅 {formatDateLong(selectedDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                🕒 {formatTime(selectedDate)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const merged = new Date(selectedDate);
                    merged.setFullYear(date.getFullYear());
                    merged.setMonth(date.getMonth());
                    merged.setDate(date.getDate());
                    setSelectedDate(merged);
                  }
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const merged = new Date(selectedDate);
                    merged.setHours(date.getHours());
                    merged.setMinutes(date.getMinutes());
                    setSelectedDate(merged);
                  }
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEvent}
              >
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#1A1A2E" },
  addButton: {
    backgroundColor: "#4C6EF5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555", marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: "#888", textAlign: "center" },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C6EF5",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eventTimeBox: { width: 64, justifyContent: "center" },
  eventTime: { fontSize: 14, fontWeight: "700", color: "#333" },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  eventNotes: { fontSize: 13, color: "#777", marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  pickerButton: {
    backgroundColor: "#F0F1FA",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  pickerButtonText: { fontSize: 14, color: "#333" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  cancelButton: { backgroundColor: "#EEE" },
  cancelButtonText: { color: "#555", fontWeight: "600" },
  saveButton: { backgroundColor: "#4C6EF5" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
});