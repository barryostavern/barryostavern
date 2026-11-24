import { MutableRefObject, useEffect, useRef } from 'react';
import { captureTicketOrder, createTicketOrder } from '../../../services/tickets';

interface PayPalButtons {
  render: (container: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}

interface PayPalNamespace {
  Buttons: (options: {
    style?: {
      layout?: 'vertical';
      color?: 'gold';
      shape?: 'rect';
      label?: 'pay';
    };
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: () => void;
  }) => PayPalButtons;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const paypalScripts = new Map<string, Promise<void>>();

function loadPayPalSdk(clientId: string): Promise<void> {
  const existing = paypalScripts.get(clientId);
  if (existing) return existing;

  const pending = new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    const params = new URLSearchParams({
      'client-id': clientId,
      currency: 'USD',
      intent: 'capture',
      'disable-funding': 'paylater,credit',
    });
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.dataset.paypalSdk = clientId;
    script.onload = () => resolve();
    script.onerror = () => {
      paypalScripts.delete(clientId);
      reject(new Error('PayPal could not load. Try again in a moment.'));
    };
    document.body.appendChild(script);
  });

  paypalScripts.set(clientId, pending);
  return pending;
}

function PayPalTicketButton({
  clientId,
  quantityRef,
  onPaid,
  onMessage,
}: {
  clientId: string;
  quantityRef: MutableRefObject<number>;
  onPaid: (confirmationToken: string) => void;
  onMessage: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let buttons: PayPalButtons | null = null;

    loadPayPalSdk(clientId)
      .then(async () => {
        if (cancelled || !container || !window.paypal) return;

        let reported = false;
        buttons = window.paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
          createOrder: async () => {
            reported = false;
            try {
              return await createTicketOrder(quantityRef.current);
            } catch (error) {
              reported = true;
              onMessage(error instanceof Error ? error.message : 'Could not start checkout. Try again.');
              throw error;
            }
          },
          onApprove: async (data) => {
            reported = false;
            try {
              const confirmationToken = await captureTicketOrder(data.orderID);
              onPaid(confirmationToken);
            } catch (error) {
              reported = true;
              onMessage(
                error instanceof Error ? error.message : 'PayPal could not complete this payment.'
              );
            }
          },
          onCancel: () => {
            onMessage('Checkout was cancelled.');
          },
          onError: () => {
            if (!reported) {
              onMessage('PayPal could not complete checkout. Try again.');
            }
          },
        });

        await buttons.render(container);
        if (cancelled) {
          await buttons.close();
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onMessage(error instanceof Error ? error.message : 'PayPal could not load. Try again in a moment.');
        }
      });

    return () => {
      cancelled = true;
      if (buttons) {
        void buttons.close().catch(() => undefined);
      }
    };
  }, [clientId, onMessage, onPaid, quantityRef]);

  return <div ref={containerRef} />;
}

export default PayPalTicketButton;
