import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACTIVE_ORDER_POLICY, buildTrackingState, useActiveOrder } from '../hooks/useActiveOrder';

interface ActiveOrderGateProps {
  isRatingModalOpen?: boolean;
}

export const ActiveOrderGate: React.FC<ActiveOrderGateProps> = ({ isRatingModalOpen = false }) => {
  const { order, orderId, isLoading } = useActiveOrder();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || isRatingModalOpen || !order || !orderId) return;

    const isEditingActiveRoute =
      location.pathname === '/your-route' &&
      location.state?.editMode === true &&
      location.state?.orderId === orderId;
    const isAllowedPath =
      location.pathname === '/what-went-wrong' ||
      location.pathname === '/login' ||
      location.pathname === '/auth' ||
      location.pathname.startsWith('/auth/') ||
      location.pathname === '/signup' ||
      location.pathname === '/register';

    if (isEditingActiveRoute || isAllowedPath) return;

    const requiredPath = ACTIVE_ORDER_POLICY.routeForOrder(order);
    const alreadyHasTrackingState =
      location.pathname === requiredPath &&
      location.state?.orderId === orderId &&
      location.state?.orderData;

    if (alreadyHasTrackingState) return;

    navigate(requiredPath, {
      replace: true,
      state: buildTrackingState(order, orderId),
    });
  }, [isLoading, isRatingModalOpen, order, orderId, location, navigate]);

  return null;
};
