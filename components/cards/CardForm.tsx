// components/cards/CardForm.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { BusinessCard, CreateBusinessCardDTO } from '../../types/businessCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CardFormProps {
  initialData?: BusinessCard;
  onSubmit: (data: CreateBusinessCardDTO) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CardForm = ({ initialData, onSubmit, onCancel, isLoading }: CardFormProps) => {
  const [formData, setFormData] = useState<CreateBusinessCardDTO>({
    title: initialData?.title || '',
    company: initialData?.company || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    address: initialData?.address || '',
    notes: initialData?.notes || '',
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    onSubmit(formData);
  };

  const updateField = (field: keyof CreateBusinessCardDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {initialData ? 'Edit Business Card' : 'Create Business Card'}
        </Text>

        <Input
          label="Title *"
          value={formData.title}
          onChangeText={(value) => updateField('title', value)}
          placeholder="e.g., John Doe, CEO"
        />

        <Input
          label="Company"
          value={formData.company}
          onChangeText={(value) => updateField('company', value)}
          placeholder="e.g., Acme Corp"
        />

        <Input
          label="Email"
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="john@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Phone"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
        />

        <Input
          label="Website"
          value={formData.website}
          onChangeText={(value) => updateField('website', value)}
          placeholder="https://example.com"
          keyboardType="url"
          autoCapitalize="none"
        />

        <Input
          label="Address"
          value={formData.address}
          onChangeText={(value) => updateField('address', value)}
          placeholder="123 Main St, City, State"
          multiline
          numberOfLines={3}
        />

        <Input
          label="Notes"
          value={formData.notes}
          onChangeText={(value) => updateField('notes', value)}
          placeholder="Additional notes..."
          multiline
          numberOfLines={4}
        />

        <View style={styles.buttons}>
          <Button
            title={initialData ? 'Update Card' : 'Create Card'}
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.submitButton}
          />
          <Button
            title="Cancel"
            onPress={onCancel}
            style={styles.cancelButton}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttons: {
    marginTop: 20,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    borderColor: '#ccc',
  },
});

export default CardForm;