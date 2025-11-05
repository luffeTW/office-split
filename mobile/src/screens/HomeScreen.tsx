import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { groupService } from '../services/groupService';
import { transactionService } from '../services/transactionService';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

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

  React.useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups]);

  const handleLogout = async () => {
    Alert.alert('確認', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>歡迎, {user?.username}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>
      </View>

      {selectedGroup && (
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>{selectedGroup.name}</Text>
          {selectedGroup.description && (
            <Text style={styles.groupDescription}>{selectedGroup.description}</Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.quickButton}
        onPress={() => navigation.navigate('Transactions' as never)}
      >
        <Text style={styles.quickButtonText}>快速記帳</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近交易</Text>
        {transactions && transactions.length > 0 ? (
          transactions.slice(0, 5).map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionCategory}>
                  {transaction.categoryIcon} {transaction.categoryName}
                </Text>
                <Text style={styles.transactionDescription}>
                  {transaction.description || '無描述'}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>尚無交易記錄</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('Groups' as never)}
      >
        <Text style={styles.navButtonText}>查看所有群組</Text>
      </TouchableOpacity>
    </ScrollView>
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
    padding: 20,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#1976d2',
    fontSize: 14,
  },
  groupCard: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
  },
  quickButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  navButton: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  navButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
