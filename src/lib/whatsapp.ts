import { Order } from '@/types';
import { formatCurrency } from './utils';

/**
 * Clean phone string and prepend DDI 55 (Brazil) if not present.
 */
export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

/**
 * Generate official WhatsApp deep link (https://wa.me/...)
 */
export function getWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return '#';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp link for a customer asking a vendor a question.
 */
export function getVendorContactLink(vendorPhone: string, vendorName: string, itemOrOrder?: string): string {
  let message = `Olá! Gostaria de tirar uma dúvida sobre a barraca *${vendorName}* na feira livre.`;
  if (itemOrOrder) {
    message += ` Assunto: ${itemOrOrder}.`;
  }
  return getWhatsAppLink(vendorPhone, message);
}

/**
 * Generate WhatsApp link for sending the pickup pass details directly to the vendor.
 */
export function getPickupPassWhatsAppLink(order: Order, vendorPhone?: string): string {
  const targetPhone = vendorPhone || order.clientPhone || '87998018279';
  const itemsText = order.items
    ? order.items.map(i => `• ${i.quantity}x ${i.productName}`).join('\n')
    : '';

  const message = `Olá! Gostaria de confirmar meu pré-pedido *#${order.orderNumber}* na *${order.vendorName || 'FeiraLocal'}*.\n\n` +
    `📋 *Resumo do Pedido:*\n${itemsText}\n\n` +
    `💰 *Valor Total:* ${formatCurrency(order.totalAmount)}\n` +
    `📍 *Retirada:* ${order.pickupDate} (${order.pickupLocation})\n\n` +
    `Estarei aí para retirar meus produtos fresquinhos!`;

  return getWhatsAppLink(targetPhone, message);
}

/**
 * Generate WhatsApp link for a vendor notifying a customer that their order is READY for pickup.
 */
export function getClientReadyNotifyLink(order: Order, clientPhoneOverride?: string): string {
  const targetPhone = clientPhoneOverride || order.clientPhone || '87998018279';

  const message = `Olá, *${order.clientName}*! 🧺\n\n` +
    `Seu pré-pedido *#${order.orderNumber}* na *${order.vendorName || 'nossa barraca'}* já está *PRONTO* para retirada!\n\n` +
    `📍 *Local de Retirada:* ${order.pickupLocation}\n` +
    `💰 *Valor Total:* ${formatCurrency(order.totalAmount)}\n\n` +
    `Pode passar na barraca para retirar seus produtos frescos sem pegar fila! Obrigado pela preferência!`;

  return getWhatsAppLink(targetPhone, message);
}
