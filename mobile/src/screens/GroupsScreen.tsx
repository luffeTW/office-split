import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { groupService } from '../services/groupService';

export default function GroupsScreen() {
  const navigation = useNavigation();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.groupsList}>
        {groups && groups.length > 0 ? (
          groups.map((group) => (
            <TouchableOpacity key={group.id} style={styles.groupCard}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
              )}
              <Text style={styles.groupMeta}>
                建立者: {group.creatorName} | 成員: {group.members?.length || 0}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>尚未加入任何群組</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  groupsList: {
    padding: 15,
  },
  groupCard: {
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
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  groupMeta: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});
