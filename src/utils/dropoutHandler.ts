/**
 * @deprecated This file is being replaced by the modules in the /dropout directory.
 * Please import from 'utils/dropout' instead.
 */
import {
  handlePlayerSelfDropout as newHandlePlayerSelfDropout,
  handlePlayerDropoutAndOffers as newHandlePlayerDropoutAndOffers
} from './dropout';

export const handlePlayerSelfDropout = newHandlePlayerSelfDropout;
export const handlePlayerDropoutAndOffers = newHandlePlayerDropoutAndOffers;

// This file is deprecated. Please use the new modules in the /dropout directory instead.
// The functions are re-exported here for backwards compatibility.
// They will be removed in a future version.