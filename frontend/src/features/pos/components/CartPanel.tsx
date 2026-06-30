import { usePOSStore } from '../store/pos-store';
import { Trash2, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';

export default function CartPanel({ onHoldSale }: { onHoldSale?: () => void }) {
  const { cartItems, updateItemQuantity, updateItemDiscount, removeItem, subtotal, totalDiscount, taxAmount, finalTotal, clearCart } = usePOSStore();

  return (
    <div className="flex h-full flex-col">
      {/* Cart Header */}
      <div className="h-14 px-4 border-b border-outline-variant flex items-center justify-between shrink-0 bg-surface">
        <h2 className="font-title-md text-title-md text-on-surface">Current Sale</h2>
        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <button
              onClick={() => clearCart()}
              className="text-error hover:bg-error-container/50 px-2 py-1 rounded text-body-sm transition-colors"
            >
              Clear Cart
            </button>
          )}
          <span className="bg-primary-container text-on-primary-container font-label-md text-label-md px-4 py-1 rounded-full">
            {cartItems.length} Items
          </span>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto bg-surface-container-lowest">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-outline">
            <ShoppingCartIcon className="mb-4 h-16 w-16 opacity-20" />
            <p className="font-body-md">Scan barcode or search to add items</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container sticky top-0 z-10">
              <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                <th className="py-2 pl-4 font-medium w-2/5">Item</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium text-center">Qty</th>
                <th className="py-2 font-medium text-center">Disc</th>
                <th className="py-2 pr-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {cartItems.map((item) => {
                const stripSize = item.medicine.units_per_strip || 0;
                const packSize = item.medicine.units_per_pack || 0;
                const hasStrip = stripSize > 1;
                const hasBox = packSize > stripSize && packSize > 1;

                // How many complete strips & remainder tabs
                const stripCount = hasStrip ? Math.floor(item.quantity / stripSize) : 0;
                const tabRemainder = hasStrip ? item.quantity % stripSize : 0;

                return (
                  <tr key={item.cart_id} className="group hover:bg-surface-container-low transition-colors duration-150">
                    <td className="py-2 pl-4 align-top">
                      <div className="font-title-md text-body-md font-bold text-on-surface flex items-center gap-2 flex-wrap">
                        {item.medicine.name}
                        {item.batch_number && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded font-bold">
                            Batch: {item.batch_number}
                          </span>
                        )}
                      </div>
                      <div className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                        <span>Stock: {item.medicine.total_quantity ?? item.medicine.available_quantity ?? 0}</span>
                        {/* Packaging quick summary inline */}
                        {(hasStrip || hasBox) && (
                          <span className="font-label-md text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                            {hasBox && Math.floor(item.quantity / packSize) > 0 && (
                              <>{Math.floor(item.quantity / packSize)}box{' '}</>
                            )}
                            {hasBox
                              ? `${Math.floor((item.quantity % packSize) / stripSize)}strp`
                              : `${stripCount}strp`}
                            {tabRemainder > 0 && ` +${tabRemainder}tab`}
                          </span>
                        )}
                      </div>

                      {/* ── Packaging Quick-Select Buttons ── */}
                      {hasStrip && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">


                          {/* STRIP button */}
                          <div className="flex items-center gap-[1px]">
                            <button
                              onClick={() => {
                                const strips = Math.max(1, stripCount);
                                const newQty = Math.max(stripSize, (strips - 1) * stripSize);
                                updateItemQuantity(item.cart_id, newQty);
                              }}
                              disabled={stripCount <= 1 && tabRemainder === 0}
                              className="flex h-5 w-5 items-center justify-center rounded-l border border-outline-variant bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none transition text-[10px] font-bold text-on-surface-variant"
                              title="Remove 1 Strip"
                              type="button"
                            >
                              <ChevronDown size={12} />
                            </button>
                            <button
                              onClick={() => {
                                const newQty = (stripCount + 1) * stripSize;
                                updateItemQuantity(item.cart_id, newQty);
                              }}
                              className="px-2 h-5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-y border-outline-variant font-label-md text-[10px] transition active:scale-95"
                              type="button"
                              title={`Add 1 Strip (${stripSize} tabs)`}
                            >
                              Strip
                            </button>
                            <button
                              onClick={() => {
                                const newQty = (stripCount + 1) * stripSize;
                                updateItemQuantity(item.cart_id, newQty);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-r border border-outline-variant bg-surface-container hover:bg-surface-container-high transition text-[10px] font-bold text-on-surface-variant"
                              title="Add 1 Strip"
                              type="button"
                            >
                              <ChevronUp size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 align-top">
                      <div className="font-body-md text-on-surface-variant mt-1">Rs {item.unit_price.toFixed(2)}</div>
                    </td>
                    <td className="py-2 align-top text-center">
                      <div className="flex items-center justify-center gap-[2px] mt-1 bg-surface-container-high p-1 rounded-full w-max mx-auto">
                        <button 
                          onClick={() => updateItemQuantity(item.cart_id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-on-surface hover:bg-outline-variant active:scale-90 transition-all disabled:opacity-40"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.cart_id, parseInt(e.target.value) || 1)}
                          className="w-10 h-6 bg-transparent text-center font-body-md font-bold focus:outline-none"
                        />
                        <button 
                          onClick={() => updateItemQuantity(item.cart_id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 active:scale-90 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 align-top text-center">
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <input 
                          type="number" 
                          value={item.discount_value}
                          onChange={(e) => updateItemDiscount(item.cart_id, item.discount_type, parseFloat(e.target.value) || 0)}
                          className="w-12 h-8 rounded-md border border-outline-variant text-center font-body-md font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-surface-container-lowest"
                        />
                        <button 
                          onClick={() => updateItemDiscount(item.cart_id, item.discount_type === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE', item.discount_value)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant bg-surface hover:bg-surface-container-high text-on-surface-variant font-label-md transition-all"
                        >
                          {item.discount_type === 'PERCENTAGE' ? '%' : 'Rs'}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top text-right">
                      <div className="font-title-md text-body-md font-bold text-on-surface mt-1 mb-2">Rs {item.subtotal.toFixed(2)}</div>
                      <button 
                        onClick={() => removeItem(item.cart_id)}
                        className="text-error hover:text-error/80 p-1 bg-error-container/50 hover:bg-error-container rounded transition-colors inline-block"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cart Summary */}
      <div className="p-4 bg-surface border-t border-outline-variant shrink-0">
        <div className="space-y-1 text-body-md mb-4">
          <div className="flex justify-between text-on-surface-variant">
            <span>Subtotal</span>
            <span className="font-medium">Rs {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">-Rs {totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Tax (0%)</span>
            <span className="font-medium">Rs {taxAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onHoldSale}
            className="flex-1 bg-surface-container-highest text-on-surface font-title-md py-3 rounded-lg hover:bg-outline-variant transition-colors active:scale-95"
          >
            Hold Sale (F8)
          </button>
          <div className="flex-1 bg-primary text-on-primary rounded-lg flex items-center justify-between px-4 py-2">
            <span className="font-title-md text-body-sm opacity-80">Total</span>
            <span className="font-headline-lg text-title-md tracking-tight">Rs {finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}
