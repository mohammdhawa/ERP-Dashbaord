import React from "react";

// One line under an HR leave action: what is left of the year's balance after
// it (API doc §16.2). `balance` is the figures object an action returns, or
// null/undefined (some callers have none), in which case nothing is drawn.
//
// remaining_days never drops below 0, so a forced excuse is shown through
// over_balance_days instead of a negative remainder.
const BalanceNote = ({ balance }) => {
  if (!balance || !Number.isFinite(balance.remaining_days)) return null;

  return (
    <div className="text-muted small">
      المتبقي {balance.remaining_days}
      {Number.isFinite(balance.allocated_days) && ` من ${balance.allocated_days}`}{" "}
      يوماً
      {balance.over_balance_days > 0 &&
        ` — تجاوز الرصيد بمقدار ${balance.over_balance_days} يوماً`}
    </div>
  );
};

export default BalanceNote;
