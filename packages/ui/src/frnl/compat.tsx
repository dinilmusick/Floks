import React from 'react';
import type { FrnlStore } from '@ultrst-armada/frnlts';

export interface FrnlPrimitiveProps {
  id: string;
  as?: string;
  store: FrnlStore;
  state?: string;
  properties?: Record<string, unknown>;
  bounds?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  hostProps?: Record<string, unknown>;
  children?: React.ReactNode;
}

export const FrnlPrimitive: React.FC<FrnlPrimitiveProps> = ({
  id,
  as: Component = 'div',
  store,
  state = 'default',
  properties = {},
  className = '',
  style = {},
  hostProps = {},
  children,
}) => {
  React.useEffect(() => {
    store.getState().registerEntity(id, {
      state,
      properties: { ...properties, kind: 'primitive' },
    });
    return () => {
      store.getState().unregisterEntity(id);
    };
  }, [id, store]);

  React.useEffect(() => {
    const entity = store.getState().entities[id];
    if (entity && entity.state !== state) {
      store.getState().setEntityState(id, state);
    }
  }, [id, state, store]);

  return React.createElement(
    Component,
    {
      ...hostProps,
      id,
      className,
      style,
      'data-frnl-id': id,
      'data-frnl-kind': 'ui-primitive',
      'data-frnl-state': state,
    },
    children
  );
};

export interface FrnlCompositeProps {
  id: string;
  store: FrnlStore;
  state?: string;
  properties?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  slots?: React.ReactNode;
  children?: React.ReactNode;
}

export const FrnlComposite: React.FC<FrnlCompositeProps> = ({
  id,
  store,
  state = 'default',
  properties = {},
  className = '',
  style = {},
  slots,
  children,
}) => {
  React.useEffect(() => {
    store.getState().registerEntity(id, {
      state,
      properties: { ...properties, kind: 'composite' },
    });
    return () => {
      store.getState().unregisterEntity(id);
    };
  }, [id, store]);

  return (
    <div
      id={id}
      className={className}
      style={style}
      data-frnl-id={id}
      data-frnl-kind="ui-composite"
      data-frnl-state={state}
    >
      {slots}
      {children}
    </div>
  );
};

export interface FrnlSlotProps {
  id: string;
  address?: string;
  occupantId?: string;
  occupantKind?: string;
  store: FrnlStore;
  occupants?: Record<string, React.ReactNode>;
  children?: React.ReactNode;
}

export const FrnlSlot: React.FC<FrnlSlotProps> = ({
  id,
  occupantId,
  occupants = {},
  children,
}) => {
  return (
    <div data-frnl-slot-id={id} className="contents">
      {(occupantId && occupants[occupantId]) || Object.values(occupants)[0] || children}
    </div>
  );
};
