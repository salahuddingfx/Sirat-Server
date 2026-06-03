const { db } = require("../config/db.config");
const { user, address } = require("../db/schema");
const { eq } = require("drizzle-orm");
const crypto = require("crypto");

const getUserById = async (id) => {
  const foundUser = await db.query.user.findFirst({
    where: eq(user.id, id),
    with: { addresses: true },
  });
  if (foundUser) delete foundUser.password;
  return foundUser;
};

const updateUserProfile = async (id, updateData) => {
  const { name, phone, username, avatar, addresses } = updateData;

  let updatePayload = {
    name,
    phone,
    username,
    avatar,
  };

  return await db.transaction(async (tx) => {
    await tx.update(user)
      .set(updatePayload)
      .where(eq(user.id, id));

    if (addresses && Array.isArray(addresses)) {
      await tx.delete(address).where(eq(address.userId, id));
      for (const addr of addresses) {
        await tx.insert(address).values({
          id: crypto.randomUUID(),
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country || "Bangladesh",
          isDefault: addr.isDefault || false,
          userId: id,
        });
      }
    }

    const updatedUser = await tx.query.user.findFirst({
      where: eq(user.id, id),
      with: { addresses: true },
    });

    if (updatedUser) delete updatedUser.password;
    return updatedUser;
  });
};

module.exports = { getUserById, updateUserProfile };