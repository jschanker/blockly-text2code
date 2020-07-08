/**
 * Forms all pairs of items from two given Arrays, combining the pairs
 * when doConcat is true
 * @param {!Array} arr1 - the first Array, must be Array.<Array> when doConcat
 * is true
 * @param {!Array} arr2 - the second Array
 * @param {boolean} doConcat - whether to combine pairs
 * @return {Array} Cartesian product of two Arrays as an Array or Array of Arrays
 * formed by concatenating every possible pair of items where the first one is from
 * the first Array and the second is from the second one
 */
export function cartesianProductPairArray(arr1, arr2, doConcat) {
  if(!(arr1 instanceof Array) || !(arr2 instanceof Array)) return [];
  else return arr1.reduce((acc, firstItem) => 
    acc.concat(arr2.map(secondItem => doConcat ? 
      firstItem.concat(secondItem) : [firstItem, secondItem])), []);
}

/**
 * Returns all n-tuples where an ith coordinate is from the ith Array;
 * when only one Array is present, returns the Array  
 * @param {!Array.<Array>} arrs length n Array of Arrays to use
 * @return {Array.<Array>} resulting Array of arrs.length-tuples  
 */
export function cartesianProductArray(arrs) {
	if(arrs.length === 0) {
	  return [];
	} else if(arrs.length === 1) {
		return arrs[0].map(arr => [arr]);
	} else {
		return arrs.reduce((acc, arr, index) => 
  	  cartesianProductPairArray(acc, arr, index > 1));
	}
};