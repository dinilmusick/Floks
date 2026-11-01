import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DirectChatInput } from './DirectChatInput.js';

describe('DirectChatInput bug reporting', () => {
  it('reports the current chat text through the same composer', () => {
    const onReportBug = vi.fn();
    render(<DirectChatInput onSendMessage={vi.fn()} onReportBug={onReportBug} />);
    fireEvent.change(screen.getByPlaceholderText(/Type a prompt/), { target: { value: 'Save button is broken' } });
    fireEvent.click(screen.getByTitle('Report bug'));
    expect(onReportBug).toHaveBeenCalledWith('Save button is broken');
  });
});
