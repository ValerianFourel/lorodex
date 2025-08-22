// app/(tabs)/create-card.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BusinessCard, CreateBusinessCardDTO } from '../../types/businessCard';
import { BusinessCardService } from '../../lib/businessCards';
import { useAuth } from '../../components/auth/AuthProvider';
import CardForm  from '../../components/cards/CardForm';

export default function CreateCardScreen() {
  const { user } = useAuth();
  const { cardId } = useLocalSearchParams();
  const [existingCard, setExistingCard] = useState<BusinessCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  useEffect(() => {
    if (cardId && typeof cardId === 'string') {
      loadCard(cardId);
    }
  }, [cardId]);

  const loadCard = async (id: string) => {
    try {
      setIsLoadingCard(true);
      const card = await BusinessCardService.getById(id);
      if (card) {
        setExistingCard(card);
      } else {
        Alert.alert('Error', 'Business card not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', 'Failed to load business card');
      router.back();
    } finally {
      setIsLoadingCard(false);
    }
  };

  const handleSubmit = async (data: CreateBusinessCardDTO) => {
    if (!user) return;

    try {
      setIsLoading(true);

      if (existingCard) {
        // Update existing card
        await BusinessCardService.update(existingCard.id, user.id, data);
        Alert.alert('Success', 'Business card updated successfully');
      } else {
        // Create new card
        await BusinessCardService.create(user.id, data);
        Alert.alert('Success', 'Business card created successfully');
      }

      router.back();
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save business card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoadingCard) {
    return (
      <View style={styles.container}>
        {/* Add loading spinner here */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CardForm
        initialData={existingCard || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
