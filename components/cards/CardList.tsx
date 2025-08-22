// components/cards/CardList.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { BusinessCard } from '../../types/businessCard';
import { CardItem } from './CardItem';

interface CardListProps {
  cards: BusinessCard[];
  onEdit: (card: BusinessCard) => void;
  onDelete: (card: BusinessCard) => void;
  isLoading?: boolean;
}

export function CardList({ cards, onEdit, onDelete, isLoading }: CardListProps) {
  const handleDelete = (card: BusinessCard) => {
    Alert.alert(
      'Delete Business Card',
      `Are you sure you want to delete "${card.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(card)
        }
      ]
    );
  };

  if (cards.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Business Cards</Text>
        <Text style={styles.emptySubtitle}>
          Create your first business card to get started
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CardItem
          card={item}
          onEdit={() => onEdit(item)}
          onDelete={() => handleDelete(item)}
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default CardList;