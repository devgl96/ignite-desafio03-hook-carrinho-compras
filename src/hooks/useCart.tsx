import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {   
      // Verify if this product exists in JSON Fake API
      let thisProductExists = await api.get(`/products/${productId}`);

      // If this exists
      if(thisProductExists.data) {
        // Filter the product in cart
        let resultFilterProduct = cart.filter(product => product.id === productId)[0];

        // Verify if the product exists in the cart
        if(resultFilterProduct) {
          // Stock of product
          let stockProduct = await api.get(`/stock/${productId}`);

          // Max amount of product
          const maxAmountProduct = stockProduct.data.amount;

          // Amount after increase
          const amount = resultFilterProduct.amount + 1;

          // Verify if the amount of product can be increased
          if(amount > maxAmountProduct) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }

          // Increasing the amount of product
          resultFilterProduct.amount = amount;

          // New Cart without the product adding
          let newCart = cart.filter(product => product.id !== productId);
  
          // Adding the product with new amount
          newCart.push(resultFilterProduct);
  
          // Update the cart
          setCart(newCart);

          // Save in the localStorage
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        } else {
          // Catch the product from API    
          await api.get(`/products/${productId}`)
            .then((response) => {
              setCart([...cart, {...response.data, amount: 1}]);
    
              let product = {...response.data, amount: 1};
              // Save the data in localStorage
              localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]));
                
              return cart;
            }
          );        
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Verify if the product exists in the cart
      let isProductExist = cart.filter(product => product.id === productId)[0];

      if(isProductExist) {
        let removeProductToCart = cart.filter(product => product.id !== productId);
  
        // Update the cart
        setCart(removeProductToCart);
  
        // Save the rest of the products in localStorage
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProductToCart));
      } else {
        throw Error();
      }
    } catch {   
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // Stock of product
      let stock = await api.get(`/stock/${productId}`);

      // Max amount of product 
      const maxAmountProduct = stock.data.amount;
      
      // Verify if the amount can be changed
      if(amount < 1 || amount > maxAmountProduct) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      // Get the product from cart
      let newProductAmount = cart.filter(product => product.id === productId)[0];
      
      // Verify if the product exists in stock
      if(newProductAmount) {
        // Update the amount of product
        newProductAmount.amount = amount;

        // New Cart without the product updated
        let newCart = cart.filter(product => product.id !== productId);

        // Adding the product with new amount
        newCart.push(newProductAmount);

        // Update the cart
        setCart(newCart);

        // Save the new data in localStorage
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw Error();
      }
    } catch {  
      toast.error("Erro na alteração de quantidade do produto");
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
