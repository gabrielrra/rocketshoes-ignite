import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let newCart = []
    try {
      const { amount: amountInStock } = await api.get('stock/' + productId).then(res => res.data)
      if (amountInStock === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productInCart = cart.find(product => product.id === productId)

      if (productInCart) {
        if (productInCart.amount === amountInStock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCart = cart.map((product) => {
          if (product.id === productId) {
            return ({ ...product, amount: product.amount + 1 })
          }
          return product
        })

      } else {
        let product = await api.get('products/' + productId).then(res => res.data)
        if (product) {
          newCart = [...cart, { ...product, amount: 1 }]
        } else {
          newCart = cart
          toast.error('Produto não encontrado');
        }
      }
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let newCart = [...cart]
      let deleteIndex = cart.findIndex((product) => product.id === productId)
      if (deleteIndex < 0) {
        toast.error('Erro na remoção do produto');
        return
      }
      newCart.splice(deleteIndex, 1)
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) return

      const { amount: amountInStock } = await api.get('stock/' + productId).then(res => res.data)
      if (amountInStock === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else if (amount > amountInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productInCart = cart.find(product => product.id === productId)

      if (productInCart) {

        let changingIndex = cart.findIndex(({ id }) => id === productId)

        let newCart = [...cart]
        newCart[changingIndex].amount = amount

        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        toast.error('Produto não encontrado');

      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
