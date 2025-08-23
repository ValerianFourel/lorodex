// app/(tabs)/cards.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { BusinessCard } from '../../types/businessCard';
import { BusinessCardService } from '../../lib/businessCards';
import { useAuth } from '../../components/auth/AuthProvider';
import  CardList  from '../../components/cards/CardList';
import { Button } from '../../components/ui/Button';

export default function CardsScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

const loadCards = async () => {
  if (!user) return;

  try {
    setIsLoading(true);
    const response = await BusinessCardService.getByUserId(user.id);
    
    // Extract the cards array from the response object
    if (response.success && response.cards) {
      setCards(response.cards);
    } else {
      console.error('Error loading cards:', response.error);
      Alert.alert('Error', response.error || 'Failed to load business cards');
      setCards([]); // Set empty array on error
    }
  } catch (error) {
    console.error('Error loading cards:', error);
    Alert.alert('Error', 'Failed to load business cards');
    setCards([]); // Set empty array on error
  } finally {
    setIsLoading(false);
  }
};

  const handleDelete = async (card: BusinessCard) => {
    if (!user) return;

    try {
      await BusinessCardService.delete(card.id, user.id);
      setCards(prev => prev.filter(c => c.id !== card.id));
    } catch (error) {
      console.error('Error deleting card:', error);
      Alert.alert('Error', 'Failed to delete business card');
    }
  };

  const handleCreateNew = () => {
    router.push('/(tabs)/create-card');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Business Cards</Text>
        <Button
          title="Add New"
          onPress={handleCreateNew}
          style={styles.addButton}
        />
      </View>

      <CardList
        cards={cards}
        onEdit={print} // handleEdit
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
