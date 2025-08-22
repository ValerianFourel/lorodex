// components/cards/CardItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BusinessCard } from '../../types/businessCard';

interface CardItemProps {
  card: BusinessCard;
  onEdit: () => void;
  onDelete: () => void;
}

export function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={onEdit}>
        <Text style={styles.title}>{card.title}</Text>
        {card.company && <Text style={styles.company}>{card.company}</Text>}
        {card.email && <Text style={styles.detail}>{card.email}</Text>}
        {card.phone && <Text style={styles.detail}>{card.phone}</Text>}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  detail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  editText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  deleteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
