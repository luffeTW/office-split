import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Picker,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { groupService } from '../services/groupService';
import { categoryService } from '../services/categoryService';
import { transactionService, CreateTransactionDto } from '../services/transactionService';

export default function TransactionsScreen() {
  const navigation = useNavigation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionDto>({
    groupId: 0,
    categoryId: 0,
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    splitEqually: true,
  });

  const queryClient = useQueryClient();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return Promise.resolve([]);
      return transactionService.getTransactions(selectedGroupId);
    },
    enabled: !!selectedGroupId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalVisible(false);
      setFormData({
        groupId: selectedGroupId || 0,
        categoryId: 0,
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        splitEqually: true,
      });
      Alert.alert('成功', '交易已建立');
    },
  });

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups]);

  const handleCreateTransaction = () => {
    if (!selectedGroupId) {
      Alert.alert('錯誤', '請選擇群組');
      return;
    }
    if (formData.categoryId === 0) {
      Alert.alert('錯誤', '請選擇類別');
      return;
    }
    if (formData.amount <= 0) {
      Alert.alert('錯誤', '請輸入有效的金額');
      return;
    }
    createMutation.mutate({ ...formData, groupId: selectedGroupId });
  };

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);
  const expenseCategories = categories?.filter((c) => c.type === 'Expense') || [];

  return (
    <ScrollView style={styles.container}>
      {selectedGroup && (
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{selectedGroup.name}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.createButtonText}>新增交易</Text>
      </TouchableOpacity>

      <View style={styles.transactionsList}>
        {transactions && transactions.length > 0 ? (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionCategory}>
                  {transaction.categoryIcon} {transaction.categoryName}
                </Text>
                <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
              </View>
              {transaction.description && (
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
              )}
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString('zh-TW')} - {transaction.userName}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>尚無交易記錄</Text>
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增交易</Text>

            <TextInput
              style={styles.input}
              placeholder="金額"
              keyboardType="numeric"
              value={formData.amount.toString()}
              onChangeText={(text) =>
                setFormData({ ...formData, amount: parseFloat(text) || 0 })
              }
            />

            <Text style={styles.label}>類別</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <Picker.Item label="選擇類別" value={0} />
                {expenseCategories.map((cat) => (
                  <Picker.Item key={cat.id} label={`${cat.icon} ${cat.name}`} value={cat.id} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="描述（選填）"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateTransaction}
              >
                <Text style={styles.submitButtonText}>建立</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  groupInfo: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsList: {
    padding: 15,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#1976d2',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
