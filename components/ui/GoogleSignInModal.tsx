import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface GoogleSignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (email: string) => void;
}

export function GoogleSignInModal({ visible, onClose, onSelectAccount }: GoogleSignInModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheet}>
              
              {/* Header */}
              <View style={styles.header}>
                <Ionicons name="logo-google" size={24} color="#DB4437" style={styles.googleIcon} />
                <Text style={styles.title}>Sign in with Google</Text>
              </View>
              
              <Text style={styles.subtitle}>Choose an account to continue to Kedo</Text>

              <View style={styles.divider} />

              {/* Account 1 */}
              <TouchableOpacity 
                style={styles.accountRow} 
                onPress={() => {
                  onClose();
                  onSelectAccount('sarah.j@gmail.com');
                }}
              >
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>S</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Sarah Johnson</Text>
                  <Text style={styles.accountEmail}>sarah.j@gmail.com</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Account 2 */}
              <TouchableOpacity 
                style={styles.accountRow} 
                onPress={() => {
                  onClose();
                  onSelectAccount('user@gmail.com');
                }}
              >
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.avatarText}>U</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>User Account</Text>
                  <Text style={styles.accountEmail}>user@gmail.com</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Add Account */}
              <TouchableOpacity style={styles.accountRow} onPress={onClose}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.light.border }]}>
                  <Ionicons name="person-add-outline" size={20} color={Colors.light.textSecondary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.addAccountText}>Add another account</Text>
                </View>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  To continue, Google will share your name, email address, and language preference with Kedo.
                </Text>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Colors.light.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  googleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6', // Blue
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: Colors.light.white,
    fontSize: 18,
    fontWeight: '600',
  },
  accountInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  addAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
