// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../components/auth/AuthProvider';
import { CardList } from '../../components/cards/CardList';
import { BusinessCard } from '../../types/businessCard';
import { 
  getUserBusinessCards, 
  deleteBusinessCard, 
  // Add other functions you might need from businessCards.ts
} from '../../lib/businessCards';

export default function HomeScreen() {
  const { authState } = useAuth();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's business cards
  useEffect(() => {
    loadCards();
  }, [authState.user]);

  const loadCards = async () => {
    if (!authState.user) return;
    
    try {
      setIsLoading(true);
      const userCards = await getUserBusinessCards(authState.user.id);
      setCards(userCards);
    } catch (error) {
      console.error('Failed to load business cards:', error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (card: BusinessCard) => {
    // Navigate to edit screen - you'll implement this based on your navigation
    console.log('Edit card:', card.id);
    // router.push(`/(tabs)/create-card?id=${card.id}`); // Example with expo-router
  };

  const handleDelete = async (card: BusinessCard) => {
    if (!authState.user) return;
    
    try {
      await deleteBusinessCard(card.id, authState.user.id);
      // Reload cards after successful deletion
      await loadCards();
    } catch (error) {
      console.error('Failed to delete card:', error);
      // You might want to show an error alert here
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {authState.user?.firstName}!</Text>
        <Text style={styles.subtitle}>Your Business Cards</Text>
      </View>
      
      <View style={styles.cardSection}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading cards...</Text>
          </View>
        ) : (
          <CardList 
            cards={cards}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  cardSection: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});